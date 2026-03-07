import { compilePipelinePlan } from '../compiled/compiler'
import { planToString } from '../compiled/debug'
import { executeCompiledPlan } from '../compiled/executor'
import {
  __setCompiledPipelineEnabledForTests,
  Pipeline,
} from '../pipeline'
import { Stage } from '../stage'
import { Wrap } from '../wrap'
import { StageObject } from '../utils/types'

function executePlanPromise<T extends StageObject>(plan: any, context: T, err?: Error) {
  return new Promise<T>((resolve, reject) => {
    executeCompiledPlan(plan, err, context, (runErr, ctx) => {
      if (runErr) reject(runErr)
      else resolve((ctx ?? context) as T)
    })
  })
}

describe('compiled Pipeline skeleton', () => {
  it('compiles a flat Pipeline into linear phase-1 ops', () => {
    const pipe = new Pipeline<{ n: number }>([
      (ctx) => { ctx.n += 1 },
      (ctx) => { ctx.n += 10 },
    ])

    const plan = compilePipelinePlan(pipe as any)

    expect(plan.mode).toBe('compiled-static')
    expect(plan.entry).toBe(0)
    expect(plan.errorExit).toBe(plan.ops.length - 1)
    expect(plan.ops.map(op => op.op)).toEqual([
      'RUN_STAGE_FN',
      'SET_CTX_FROM_RESULT',
      'RUN_STAGE_FN',
      'SET_CTX_FROM_RESULT',
      'RETURN',
    ])
  })

  it('flattens nested Pipeline into one linear plan', () => {
    const nested = new Pipeline<{ n: number }>([
      (ctx) => { ctx.n += 10 },
      (ctx) => { ctx.n += 100 },
    ])
    const root = new Pipeline<{ n: number }>([
      (ctx) => { ctx.n += 1 },
      nested,
      (ctx) => { ctx.n += 1000 },
    ])

    const plan = compilePipelinePlan(root as any)
    const runOps = plan.ops.filter(op => op.op === 'RUN_STAGE_FN')

    expect(plan.mode).toBe('compiled-static')
    expect(runOps.length).toBe(4)
    expect(plan.metadata.flattenedStages).toBeGreaterThan(0)
    expect(plan.ops.some(op => op.op === 'RUN_FALLBACK_STAGE')).toBe(false)
  })

  it('marks wrapper stages as fallback ops in phase 1', () => {
    const wrap = new Wrap<{ n: number }, { n: number }>({
      stage: (ctx) => { ctx.n += 10 },
      prepare: (ctx) => ctx,
      finalize: (ctx) => ctx,
    })
    const root = new Pipeline<{ n: number }>()
    root.addStage((ctx) => { ctx.n += 1 })
    root.addStage(wrap as any)

    const plan = compilePipelinePlan(root as any)

    expect(plan.mode).toBe('compiled-hybrid')
    expect(plan.ops.some(op => op.op === 'RUN_FALLBACK_STAGE')).toBe(true)
    expect(plan.metadata.fallbackOps).toBe(1)
  })

  it('dependency signature changes after addStage()', () => {
    const pipe = new Pipeline<{ n: number }>([
      (ctx) => { ctx.n += 1 },
    ])

    const before = compilePipelinePlan(pipe as any)
    pipe.addStage((ctx: { n: number }) => { ctx.n += 10 })
    const after = compilePipelinePlan(pipe as any)

    expect(before.dependencySignature).not.toBe(after.dependencySignature)
  })

  it('reuses cached compiled plan when graph signature is unchanged', async () => {
    __setCompiledPipelineEnabledForTests(true)

    try {
      const root = new Pipeline<{ n: number }>([
        (ctx) => { ctx.n += 1 },
        (ctx) => { ctx.n += 10 },
      ])

      await root.execute({ n: 0 })
      const firstPlan = (root as any).compiledPlan
      const firstSignature = (root as any).compiledDependencySignature

      await root.execute({ n: 0 })
      const secondPlan = (root as any).compiledPlan
      const secondSignature = (root as any).compiledDependencySignature

      expect(firstPlan).toBeDefined()
      expect(secondPlan).toBe(firstPlan)
      expect(secondSignature).toBe(firstSignature)
    } finally {
      __setCompiledPipelineEnabledForTests(undefined)
    }
  })

  it('invalidates parent compiled plan when nested child Pipeline mutates', async () => {
    __setCompiledPipelineEnabledForTests(true)

    try {
      const nested = new Pipeline<{ n: number }>([
        (ctx) => { ctx.n += 10 },
      ])
      const root = new Pipeline<{ n: number }>([
        (ctx) => { ctx.n += 1 },
        nested,
      ])

      const before = await root.execute({ n: 0 })
      const firstPlan = (root as any).compiledPlan
      expect(before.n).toBe(11)

      nested.addStage((ctx) => { ctx.n += 100 })

      const after = await root.execute({ n: 0 })
      const secondPlan = (root as any).compiledPlan

      expect(after.n).toBe(111)
      expect(secondPlan).not.toBe(firstPlan)
    } finally {
      __setCompiledPipelineEnabledForTests(undefined)
    }
  })

  it('executes compiled flat plan with same result as legacy runtime', async () => {
    const root = new Pipeline<{ n: number }>()
    root.addStage((ctx) => { ctx.n += 1 })
    root.addStage(new Stage<{ n: number }>({ run: (ctx) => { ctx.n += 10 } }) as any)
    root.addStage(async (ctx) => { ctx.n += 100; return ctx })

    const plan = compilePipelinePlan(root as any)
    const legacyResult = await root.execute({ n: 0 })
    const compiledResult = await executePlanPromise(plan, { n: 0 })

    expect(compiledResult.n).toBe(legacyResult.n)
  })

  it('preserves callback-style stage semantics', async () => {
    const root = new Pipeline<{ n: number }>()
    root.addStage((ctx, done) => {
      ctx.n += 1
      done(undefined, ctx)
    })
    root.addStage((ctx) => {
      ctx.n += 10
    })

    const plan = compilePipelinePlan(root as any)
    const legacyResult = await root.execute({ n: 0 })
    const compiledResult = await executePlanPromise(plan, { n: 0 })

    expect(compiledResult.n).toBe(legacyResult.n)
  })

  it('preserves zero-arg stage semantics for sync and async functions', async () => {
    const root = new Pipeline<{ n: number }>([
      function () {
        return { n: 1 }
      },
      async function () {
        return { n: 11 }
      },
    ])

    const plan = compilePipelinePlan(root as any)
    const legacyResult = await root.execute({ n: 0 })
    const compiledResult = await executePlanPromise(plan, { n: 0 })

    expect(compiledResult.n).toBe(legacyResult.n)
  })

  it('preserves err+ctx async and err+ctx+done stage semantics', async () => {
    const root = new Pipeline<{ n: number }>([
      async (_err, ctx) => {
        ctx.n += 1
        return ctx
      },
      (_err, ctx, done) => {
        ctx.n += 10
        done(undefined, ctx)
      },
    ])

    const plan = compilePipelinePlan(root as any)
    const legacyResult = await root.execute({ n: 0 })
    const compiledResult = await executePlanPromise(plan, { n: 0 })

    expect(compiledResult.n).toBe(legacyResult.n)
  })

  it('preserves callback API behavior when compiled runtime flag is enabled', async () => {
    __setCompiledPipelineEnabledForTests(true)

    try {
      const root = new Pipeline<{ n: number }>()
      root.addStage((ctx, done) => {
        ctx.n += 1
        done(undefined, ctx)
      })
      root.addStage((ctx) => {
        ctx.n += 10
      })

      const result = await new Promise<{ n: number }>((resolve, reject) => {
        root.execute({ n: 0 }, (err, ctx) => {
          if (err) reject(err)
          else resolve(ctx as any)
        })
      })

      expect(result.n).toBe(11)
    } finally {
      __setCompiledPipelineEnabledForTests(undefined)
    }
  })

  it('executes nested compiled plan with same result as legacy runtime', async () => {
    const nested = new Pipeline<{ n: number }>([
      (ctx) => { ctx.n += 10 },
      (ctx) => { ctx.n += 100 },
    ])
    const root = new Pipeline<{ n: number }>([
      (ctx) => { ctx.n += 1 },
      nested,
      (ctx) => { ctx.n += 1000 },
    ])

    const plan = compilePipelinePlan(root as any)
    const legacyResult = await root.execute({ n: 0 })
    const compiledResult = await executePlanPromise(plan, { n: 0 })

    expect(compiledResult.n).toBe(legacyResult.n)
  })

  it('executes fallback op with same result as legacy runtime', async () => {
    const wrap = new Wrap<{ n: number }, { n: number }>({
      stage: (ctx) => { ctx.n += 10 },
      prepare: (ctx) => ctx,
      finalize: (ctx) => ctx,
    })
    const root = new Pipeline<{ n: number }>()
    root.addStage((ctx) => { ctx.n += 1 })
    root.addStage(wrap as any)
    root.addStage((ctx) => { ctx.n += 100 })

    const plan = compilePipelinePlan(root as any)
    const legacyResult = await root.execute({ n: 0 })
    const compiledResult = await executePlanPromise(plan, { n: 0 })

    expect(compiledResult.n).toBe(legacyResult.n)
  })

  it('short-circuits on error and does not run later ops', async () => {
    let reachedTail = false
    const root = new Pipeline<{ n: number }>([
      (ctx) => { ctx.n += 1 },
      () => { throw new Error('boom') },
      () => { reachedTail = true },
    ])

    const plan = compilePipelinePlan(root as any)

    await expect(executePlanPromise(plan, { n: 0 })).rejects.toBeDefined()
    expect(reachedTail).toBe(false)
  })

  it('preserves error primary message vs legacy runtime', async () => {
    const root = new Pipeline<{ n: number }>([
      () => { throw new Error('boom') },
    ])

    const plan = compilePipelinePlan(root as any)

    const legacyError = await root.execute({ n: 0 }).catch(err => err)
    const compiledError = await executePlanPromise(plan, { n: 0 }).catch(err => err)

    expect(legacyError.chain.primary.message).toBe('boom')
    expect(compiledError.chain.primary.message).toBe('boom')
  })

  it('controlled runtime flag switches Pipeline.execute to compiled path safely', async () => {
    __setCompiledPipelineEnabledForTests(true)

    try {
      const root = new Pipeline<{ n: number }>([
        (ctx) => { ctx.n += 1 },
        (ctx) => { ctx.n += 10 },
      ])

      const result = await root.execute({ n: 0 })
      expect(result.n).toBe(11)
    } finally {
      __setCompiledPipelineEnabledForTests(undefined)
    }
  })

  it('renders a readable plan dump', () => {
    const pipe = new Pipeline<{ n: number }>([
      (ctx) => { ctx.n += 1 },
    ])

    const dump = planToString(compilePipelinePlan(pipe as any))

    expect(dump).toContain('CompiledPlan')
    expect(dump).toContain('RUN_STAGE_FN')
    expect(dump).toContain('RETURN')
  })
})
