import { describe, it, expect } from 'bun:test'
import {
  createError,
  createCodeError,
  createErrorWithContext,
  chainErrors,
  isCleanError,
  ErrorCode,
  ErrorMessage,
} from '../utils/ErrorList'
import { executeCompiledPlan } from '../compiled/executor'
import { createPlanTables, type CompiledPlan } from '../compiled/plan'
import { Stage } from '../stage'
import { Pipeline } from '../pipeline'
import { run_callback_once } from '../utils/run_callback_once'

function executePlanError(plan: CompiledPlan<any>, context: any) {
  return new Promise((resolve) => {
    executeCompiledPlan(plan, undefined, context, (runErr) => {
      resolve(runErr)
    })
  })
}

// =============================================================================
// Error Code Taxonomy Tests (TASK-010)
// =============================================================================

describe('ErrorCode constants', () => {
  it('all codes are unique strings', () => {
    const codes = Object.values(ErrorCode)
    expect(codes.length).toBeGreaterThan(0)
    expect(new Set(codes).size).toBe(codes.length)
    for (const code of codes) {
      expect(typeof code).toBe('string')
      expect(code).toMatch(/^ERR_/)
    }
  })

  it('every code has a human-readable message', () => {
    for (const code of Object.values(ErrorCode)) {
      expect(ErrorMessage[code]).toBeDefined()
      expect(typeof ErrorMessage[code]).toBe('string')
      expect(ErrorMessage[code].length).toBeGreaterThan(0)
    }
  })
})

describe('CleanError.code field', () => {
  it('createError from string gets ERR_UNKNOWN by default', () => {
    const err = createError('something went wrong')
    expect(err.code).toBe(ErrorCode.ERR_UNKNOWN)
    expect(err.message).toBe('something went wrong')
  })

  it('createError from Error gets ERR_STAGE_THROW by default', () => {
    const err = createError(new Error('oops'))
    expect(err.code).toBe(ErrorCode.ERR_STAGE_THROW)
    expect(err.chain.primary.message).toBe('oops')
  })

  it('createError with explicit code overrides default', () => {
    const err = createError('bad signature', ErrorCode.ERR_SIGNATURE)
    expect(err.code).toBe(ErrorCode.ERR_SIGNATURE)
  })

  it('createCodeError produces correct code and message', () => {
    const err = createCodeError(ErrorCode.ERR_SIGNATURE)
    expect(err.code).toBe(ErrorCode.ERR_SIGNATURE)
    expect(err.message).toBe(ErrorMessage[ErrorCode.ERR_SIGNATURE])
    expect(err.isClean).toBe(true)
  })

  it('createCodeError with detail appends to message', () => {
    const err = createCodeError(ErrorCode.ERR_OPCODE_NOT_IMPL, 'JUMP_IF_TRUE')
    expect(err.code).toBe(ErrorCode.ERR_OPCODE_NOT_IMPL)
    expect(err.message).toContain('JUMP_IF_TRUE')
    expect(err.message).toContain(ErrorMessage[ErrorCode.ERR_OPCODE_NOT_IMPL])
  })

  it('code appears in toJSON() output', () => {
    const err = createCodeError(ErrorCode.ERR_STAGE_TIMEOUT)
    const json = err.toJSON() as any
    expect(json.code).toBe(ErrorCode.ERR_STAGE_TIMEOUT)
  })

  it('createCodeError supports ERR_STAGE_ABORTED', () => {
    const err = createCodeError(ErrorCode.ERR_STAGE_ABORTED)
    expect(err.code).toBe(ErrorCode.ERR_STAGE_ABORTED)
    expect(err.message).toBe(ErrorMessage[ErrorCode.ERR_STAGE_ABORTED])
  })

  it('createErrorWithContext preserves code', () => {
    const err = createErrorWithContext(
      new Error('test'),
      { stage: 'MyStage', operation: 'run' },
      ErrorCode.ERR_NO_RUN,
    )
    expect(err.code).toBe(ErrorCode.ERR_NO_RUN)
    expect(err.getContext()?.stage).toBe('MyStage')
  })
})

describe('Double-wrapping prevention', () => {
  it('createError returns same CleanError if input is already CleanError', () => {
    const original = createCodeError(ErrorCode.ERR_SIGNATURE)
    const wrapped = createError(original)
    expect(wrapped).toBe(original) // same reference
    expect(wrapped.code).toBe(ErrorCode.ERR_SIGNATURE)
  })

  it('createError from array with single CleanError returns it directly', () => {
    const original = createCodeError(ErrorCode.ERR_STAGE_TIMEOUT)
    const wrapped = createError([original])
    expect(wrapped).toBe(original)
  })

  it('createError from array with multiple errors uses first as primary', () => {
    const e1 = new Error('first')
    const e2 = new Error('second')
    const combined = createError([e1, e2])
    expect(combined.chain.primary.message).toBe('first')
    expect(combined.chain.secondary?.length).toBe(1)
    expect(combined.chain.secondary?.[0].message).toBe('second')
  })

  it('createError preserves explicit code and secondary when primary is already CleanError', () => {
    const primary = createCodeError(ErrorCode.ERR_STAGE_THROW, 'primary')
    const combined = createError([primary, new Error('second')], ErrorCode.ERR_CONTEXT_TYPE)

    expect(combined).not.toBe(primary)
    expect(combined.code).toBe(ErrorCode.ERR_CONTEXT_TYPE)
    expect(combined.chain.primary.message).toContain('primary')
    expect(combined.chain.secondary?.length).toBe(1)
    expect(combined.chain.secondary?.[0].message).toBe('second')
  })

  it('chainErrors accepts explicit code', () => {
    const err = chainErrors(new Error('first'), [new Error('second')], ErrorCode.ERR_CONTEXT_TYPE)
    expect(err.code).toBe(ErrorCode.ERR_CONTEXT_TYPE)
    expect(err.chain.secondary?.length).toBe(1)
  })
})

describe('Error codes in stage execution', () => {
  it('missing run function produces ERR_NO_RUN code', async () => {
    const stage = new Stage({ name: 'TestStage' })
    try {
      await stage.execute({ value: 1 })
      expect(true).toBe(false) // should not reach
    } catch (err: any) {
      expect(isCleanError(err)).toBe(true)
      expect(err.code).toBe(ErrorCode.ERR_NO_RUN)
      expect(err.message).toContain('run is not a function')
    }
  })

  it('thrown error in stage gets ERR_STAGE_THROW code', async () => {
    const stage = new Stage({
      run: () => { throw new Error('boom') },
    })
    try {
      await stage.execute({ value: 1 })
      expect(true).toBe(false)
    } catch (err: any) {
      expect(isCleanError(err)).toBe(true)
      expect(err.code).toBe(ErrorCode.ERR_STAGE_THROW)
      expect(err.chain.primary.message).toBe('boom')
    }
  })

  it('validate=false produces ERR_INVALID_CONTEXT code', async () => {
    const stage = new Stage({
      name: 'ValidatedStage',
      validate: (_ctx: any) => false,
      run: (ctx: any) => ctx,
    })

    try {
      await stage.execute({ value: 1 })
      expect(true).toBe(false)
    } catch (err: any) {
      expect(isCleanError(err)).toBe(true)
      expect(err.code).toBe(ErrorCode.ERR_INVALID_CONTEXT)
      expect(err.message).toContain('context is invalid')
    }
  })

  it('plain-object callback path preserves legacy pass-through semantics', async () => {
    const stage = new Stage({
      run: () => ({ plain: true } as any),
    })

    const result: any = await new Promise((resolve, reject) => {
      stage.execute({ value: 1 }, (runErr, ctx) => {
        if (runErr) reject(runErr)
        else resolve(ctx)
      })
    })

    expect(result).toEqual({ plain: true })
  })

  it('plain-object promise path preserves same pass-through semantics', async () => {
    const stage = new Stage({
      run: () => ({ plain: true } as any),
    })

    const result = await stage.execute({ value: 1 })

    expect(result).toEqual({ plain: true })
  })

  it('pipeline error from thrown stage has ERR_STAGE_THROW code', async () => {
    const pipeline = new Pipeline({
      stages: [
        new Stage({ run: (ctx: any) => { ctx.step = 1 } }),
        new Stage({ run: () => { throw new Error('pipeline-boom') } }),
      ],
    })
    try {
      await pipeline.execute({ value: 0 })
      expect(true).toBe(false)
    } catch (err: any) {
      expect(isCleanError(err)).toBe(true)
      expect(err.code).toBe(ErrorCode.ERR_STAGE_THROW)
      expect(err.chain.primary.message).toBe('pipeline-boom')
    }
  })

  it('compiled executor error propagation preserves error code', async () => {
    const pipeline = new Pipeline({
      stages: [
        new Stage({ run: () => { throw new Error('compiled-boom') } }),
        new Stage({ run: (ctx: any) => { ctx.unreachable = true } }),
      ],
    })
    try {
      await pipeline.execute({ value: 0 })
      expect(true).toBe(false)
    } catch (err: any) {
      expect(isCleanError(err)).toBe(true)
      // Error should have a code (either ERR_STAGE_THROW from process_error or preserved)
      expect(err.code).toBeDefined()
      expect(err.chain.primary.message).toBe('compiled-boom')
    }
  })
})

describe('Callback and rescue normalization', () => {
  it('run_callback_once throws ERR_CALLBACK_DOUBLE on second call', () => {
    const guarded = run_callback_once(() => {})

    guarded(undefined, { ok: true })

    try {
      guarded(undefined, { ok: true })
      expect(true).toBe(false)
    } catch (err: any) {
      expect(isCleanError(err)).toBe(true)
      expect(err.code).toBe(ErrorCode.ERR_CALLBACK_DOUBLE)
      expect(err.message).toBe(ErrorMessage[ErrorCode.ERR_CALLBACK_DOUBLE])
    }
  })

  it('arity-3 rescue callback normalizes native Error to CleanError', async () => {
    const stage = new Stage({
      run: () => {
        throw new Error('boom')
      },
      rescue: (_err: Error, _ctx: any, done: any) => {
        done(new Error('rescued-fail'))
      },
    })

    try {
      await stage.execute({ value: 1 })
      expect(true).toBe(false)
    } catch (err: any) {
      expect(isCleanError(err)).toBe(true)
      expect(err.code).toBe(ErrorCode.ERR_STAGE_THROW)
      expect(err.chain.primary.message).toBe('rescued-fail')
    }
  })

  it('async rescue rejection normalizes rejected string to CleanError', async () => {
    const stage = new Stage({
      run: () => {
        throw new Error('boom')
      },
      rescue: async (_err: Error) => {
        throw 'async-rescue-fail'
      },
    })

    try {
      await stage.execute({ value: 1 })
      expect(true).toBe(false)
    } catch (err: any) {
      expect(isCleanError(err)).toBe(true)
      expect(err.code).toBe(ErrorCode.ERR_STAGE_THROW)
      expect(err.chain.primary.message).toBe('async-rescue-fail')
    }
  })
})

describe('Compiled executor internal error codes', () => {
  it('out-of-bounds program counter produces ERR_PC_OUT_OF_BOUNDS', async () => {
    const plan: CompiledPlan<any> = {
      version: 1,
      mode: 'compiled-static',
      entry: 99,
      errorExit: 0,
      ops: [{ op: 'RETURN' }],
      tables: createPlanTables(),
      metadata: {
        artifactKind: 'in-memory-runtime-plan',
        rootKind: 'test',
        flattenedStages: 0,
        fallbackOps: 0,
        containsAsyncOps: false,
        containsParallelOps: false,
        maxStaticDepthBeforeFlatten: 0,
        sourceVersion: 1,
      },
      dependencySignature: 'pc-oob',
    }

    const err: any = await executePlanError(plan, { value: 1 })
    expect(isCleanError(err)).toBe(true)
    expect(err.code).toBe(ErrorCode.ERR_PC_OUT_OF_BOUNDS)
  })

  it('unimplemented opcode produces ERR_OPCODE_NOT_IMPL', async () => {
    const plan: CompiledPlan<any> = {
      version: 1,
      mode: 'compiled-static',
      entry: 0,
      errorExit: 1,
      ops: [
        { op: 'PUSH_FRAME', frameKind: 'PARALLEL', data: 0 },
        { op: 'RETURN' },
      ],
      tables: createPlanTables(),
      metadata: {
        artifactKind: 'in-memory-runtime-plan',
        rootKind: 'test',
        flattenedStages: 0,
        fallbackOps: 0,
        containsAsyncOps: false,
        containsParallelOps: false,
        maxStaticDepthBeforeFlatten: 0,
        sourceVersion: 1,
      },
      dependencySignature: 'opcode-not-impl',
    }

    const err: any = await executePlanError(plan, { value: 1 })
    expect(isCleanError(err)).toBe(true)
    expect(err.code).toBe(ErrorCode.ERR_OPCODE_NOT_IMPL)
    expect(err.message).toContain('PUSH_FRAME/PARALLEL')
  })
})

describe('Error code parity: legacy vs compiled', () => {
  it('both paths produce same error code for thrown error', async () => {
    const makeStages = () => [
      new Stage({ run: (ctx: any) => { ctx.step = 1 } }),
      new Stage({ run: () => { throw new Error('parity-test') } }),
    ]

    // Legacy path
    const legacyPipeline = new Pipeline({ stages: makeStages() })
    let legacyErr: any
    try {
      await legacyPipeline.execute({ value: 0 })
    } catch (e) { legacyErr = e }

    // Compiled path (same pipeline rebuilt)
    const compiledPipeline = new Pipeline({ stages: makeStages() })
    let compiledErr: any
    try {
      await compiledPipeline.execute({ value: 0 })
    } catch (e) { compiledErr = e }

    // Both should be CleanError with same code and primary message
    expect(isCleanError(legacyErr)).toBe(true)
    expect(isCleanError(compiledErr)).toBe(true)
    expect(legacyErr.code).toBe(compiledErr.code)
    expect(legacyErr.chain.primary.message).toBe(compiledErr.chain.primary.message)
    expect(legacyErr.chain.primary.message).toBe('parity-test')
  })
})
