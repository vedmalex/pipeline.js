import { afterAll, describe, expect, it } from 'bun:test'
import { __setCompiledPipelineEnabledForTests, Pipeline } from '../pipeline'
import { IfElse } from '../ifelse'
import { Stage } from '../stage'
import { Empty } from '../empty'

// Logic verification P1: IfElse compiled/fused fast path vs reference interpreter (src/ifelse.ts).
// Reference = standalone IfElse.execute (interpreter, no Pipeline). Fast path = IfElse inside a
// Pipeline with compiled mode forced on. Every test asserts fast === reference, so a failing
// test confirms a divergence on the fast path.

type Outcome = { err: string | null; log: string[]; calls: number; timedOut: boolean }
type Build = (log: string[]) => { condition: any; success?: any; failed?: any }

function runOnce(mode: 'standalone' | 'compiled', build: Build, inErr: boolean): Promise<Outcome> {
  __setCompiledPipelineEnabledForTests(mode === 'compiled')
  const log: string[] = []
  const { condition, success, failed } = build(log)
  const ifelse = new IfElse({ condition, success, failed } as any)
  const target: any = mode === 'standalone' ? ifelse : new Pipeline([ifelse] as any)
  return new Promise((resolve) => {
    let calls = 0
    const timer = setTimeout(() => {
      resolve({ err: null, log: [...log], calls, timedOut: true })
    }, 300)
    target.execute(inErr ? new Error('IN') : undefined, {}, (e: any) => {
      calls++
      clearTimeout(timer)
      resolve({
        err: e ? `${e.code ?? ''}:${e.message ?? String(e)}` : null,
        log: [...log],
        calls,
        timedOut: false,
      })
    })
  })
}

async function expectParity(build: Build, inErr = false) {
  const ref = await runOnce('standalone', build, inErr)
  const fast = await runOnce('compiled', build, inErr)
  expect(fast.calls).toBe(ref.calls)
  expect(fast.log).toEqual(ref.log)
  expect(fast.err).toEqual(ref.err)
}

afterAll(() => {
  __setCompiledPipelineEnabledForTests(undefined)
})

describe('P1 IfElse parity: fast path vs reference ifelse.ts', () => {
  // E1: this binding of arity-0 branch
  it('E1 arity-0 success branch: this is the context (reference) not undefined (fast path)', async () => {
    await expectParity((log) => ({
      condition: (_c: any) => true,
      success: function (this: any) {
        log.push(`S:this=${this === undefined ? 'undef' : typeof this}`)
      },
      failed: (_c: any) => { log.push('F') },
    }))
  })

  // E2: truthy non-boolean condition selects the wrong branch
  it('E2 condition returns 3 (truthy non-boolean): reference takes failed branch, fast path takes success', async () => {
    await expectParity((log) => ({
      condition: (_c: any) => 3,
      success: (_c: any) => { log.push('S') },
      failed: (_c: any) => { log.push('F') },
    }))
  })

  // E3: falsy 0 condition: failed plain Stage must receive the condition error and skip
  it('E3 condition returns 0: failed plain Stage gets condition error (reference), fast path runs it', async () => {
    await expectParity((log) => ({
      condition: (_c: any) => 0,
      success: (_c: any) => { log.push('S') },
      failed: new Stage(function (_c: any) { log.push('F') } as any),
    }))
  })

  // E4: boolean false from sync condition: ERR_INVALID_CONTEXT must reach failed plain Stage
  it('E4 condition returns false: reference propagates ERR_INVALID_CONTEXT into failed Empty, fast path returns OK', async () => {
    await expectParity((log) => ({
      condition: (_c: any) => false,
      success: (_c: any) => { log.push('S') },
      failed: new Empty({} as any),
    }))
  })

  // E5: null condition crashes fused path (is_thenable(null) throws outside try)
  it('E5 condition returns null: reference runs failed branch, fast path throws TypeError', async () => {
    await expectParity((log) => ({
      condition: (_c: any) => null,
      success: (_c: any) => { log.push('S') },
      failed: (_c: any) => { log.push('F') },
    }))
  })

  // E6: synchronous throw in condition: reference propagates error into failed plain Stage
  it('E6 condition throws: reference propagates error (failed plain Stage skipped), fast path runs it', async () => {
    await expectParity((log) => ({
      condition: (_c: any) => { throw new Error('cthrow') },
      success: (_c: any) => { log.push('S') },
      failed: new Stage(function (_c: any) { log.push('F') } as any),
    }))
  })

  // E7: async success branch throws -> fused .catch runs failed branch too
  it('E7 async condition true, success throws: reference stops with error, fast path also runs failed branch', async () => {
    await expectParity((log) => ({
      condition: (_c: any) => Promise.resolve(true),
      success: (_c: any) => { log.push('S'); throw new Error('bthrow') },
      failed: (_c: any) => { log.push('F') },
    }))
  })

  // E8: async success branch returns rejected promise -> failed branch also runs
  it('E8 async condition true, success returns rejected promise: failed branch must not run', async () => {
    await expectParity((log) => ({
      condition: (_c: any) => Promise.resolve(true),
      success: (_c: any) => { log.push('S'); return Promise.reject(new Error('brej')) },
      failed: (_c: any) => { log.push('F') },
    }))
  })

  // E9: input error is forwarded into success branch on generic path (reference: branch sees no err)
  it('E9 input error present, sync true condition, plain arity-3 Stage success: branch must see no input err', async () => {
    await expectParity((log) => ({
      condition: (_c: any) => true,
      success: new Stage(function (err: any, c: any, done: any) {
        log.push(`S3:err=${err ? 'E' : '-'}`)
        done(undefined, c)
      } as any),
      failed: undefined,
    }), true)
  })

  // E10: async false condition + input error: failed plain Stage must run (reference) but is skipped (fast path)
  it('E10 input error present, async false condition, plain Stage failed: reference runs failed branch', async () => {
    await expectParity((log) => ({
      condition: async (_c: any) => false,
      success: (_c: any) => { log.push('S') },
      failed: new Stage(function (_c: any) { log.push('F') } as any),
    }), true)
  })

  // E11: callback-style condition error is dropped after SCOPE frame pop
  it('E11 callback condition reports error: reference returns it via failed Empty, fast path returns OK', async () => {
    await expectParity((_log) => ({
      condition: (_c: any, cb: any) => cb(new Error('cberr'), false),
      success: (_c: any) => { _log.push('S') },
      failed: new Empty({} as any),
    }))
  })
})
