import { describe, expect, it } from 'bun:test'
import { compilePipelinePlan } from '../compiled/compiler'
import { executeCompiledPlan } from '../compiled/executor'
import { Context } from '../context'
import { Pipeline } from '../pipeline'
import { RetryOnError } from '../retryonerror'
import { Timeout } from '../timeout'

// Observation harness. Every run is raced against a timeout so that a hang
// (done never called) is recorded as `hung: true` instead of stalling the suite.
// Unhandled rejections are captured instead of failing the process.
const unhandled: unknown[] = []
process.on('unhandledRejection', (reason) => {
  unhandled.push(reason)
})

const HANG_MS = 300

function runInterp(stage: any, input: any) {
  return new Promise<{ hung: boolean; err: any; ctx: any }>((resolve) => {
    const timer = setTimeout(() => resolve({ hung: true, err: undefined, ctx: undefined }), HANG_MS)
    try {
      stage.execute(input, (err: any, ctx: any) => {
        clearTimeout(timer)
        resolve({ hung: false, err, ctx })
      })
    } catch (e) {
      clearTimeout(timer)
      resolve({ hung: false, err: e, ctx: undefined })
    }
  })
}

function runCompiled(stage: any, input: any) {
  return new Promise<{ hung: boolean; err: any; ctx: any }>((resolve) => {
    const timer = setTimeout(() => resolve({ hung: true, err: undefined, ctx: undefined }), HANG_MS)
    try {
      const plan = compilePipelinePlan(new Pipeline<any>([stage] as any) as any)
      executeCompiledPlan(plan, undefined, input, (err: any, ctx: any) => {
        clearTimeout(timer)
        resolve({ hung: false, err, ctx })
      })
    } catch (e) {
      clearTimeout(timer)
      resolve({ hung: false, err: e, ctx: undefined })
    }
  })
}

const paths: Array<[string, typeof runInterp]> = [
  ['interp', runInterp],
  ['compiled', runCompiled],
]

describe('P2 RetryOnError: attempt-state trace (plain carrier)', () => {
  for (const [name, run] of paths) {
    it(`[${name}] plain object: each attempt must start from the pre-attempt snapshot`, async () => {
      const seen: number[] = []
      let attempt = 0
      const stage = new RetryOnError<any>({
        retry: 2,
        stage: (ctx: any) => {
          seen.push(ctx.n)
          ctx.n = ctx.n + 1
          attempt++
          if (attempt < 3) throw new Error('fail')
          return ctx
        },
      } as any)
      const input = { n: 0 }
      const r = await run(stage, input)
      // Contract: every attempt sees n === 0 (state rolled back before each retry).
      expect(r.hung).toBe(false)
      expect(seen).toEqual([0, 0, 0])
    })

    it(`[${name}] plain object: returned object identity (===) with input`, async () => {
      let attempt = 0
      const stage = new RetryOnError<any>({
        retry: 2,
        stage: (ctx: any) => {
          attempt++
          ctx.n = ctx.n + 1
          if (attempt < 2) throw new Error('fail')
          return ctx
        },
      } as any)
      const input = { n: 0 }
      const r = await run(stage, input)
      // Contract (Output Contract, spec): same mutated object is returned to caller.
      expect(r.ctx === input).toBe(true)
    })

    it(`[${name}] plain object: array value inside context is rolled back`, async () => {
      const lens: number[] = []
      let attempt = 0
      const stage = new RetryOnError<any>({
        retry: 2,
        stage: (ctx: any) => {
          lens.push(ctx.arr.length)
          ctx.arr.push(9)
          attempt++
          if (attempt < 3) throw new Error('fail')
          return ctx
        },
      } as any)
      const r = await run(stage, { arr: [1] })
      expect(r.hung).toBe(false)
      expect(lens).toEqual([1, 1, 1])
    })

    it(`[${name}] plain object: Map value inside context is rolled back`, async () => {
      const sizes: number[] = []
      let attempt = 0
      const stage = new RetryOnError<any>({
        retry: 2,
        stage: (ctx: any) => {
          sizes.push(ctx.m.size)
          ctx.m.set('k' + attempt, 1)
          attempt++
          if (attempt < 3) throw new Error('fail')
          return ctx
        },
      } as any)
      const r = await run(stage, { m: new Map([['a', 1]]) })
      expect(r.hung).toBe(false)
      expect(sizes).toEqual([1, 1, 1])
    })
  }
})

describe('P2 RetryOnError: Context carrier', () => {
  for (const [name, run] of paths) {
    it(`[${name}] Context: each attempt starts from pre-attempt state`, async () => {
      const seen: number[] = []
      let attempt = 0
      const stage = new RetryOnError<any>({
        retry: 2,
        stage: (ctx: any) => {
          seen.push(ctx.n)
          ctx.n = ctx.n + 1
          attempt++
          if (attempt < 3) throw new Error('fail')
          return ctx
        },
      } as any)
      const input = Context.ensure({ n: 0 }) as any
      const r = await run(stage, input)
      expect(r.hung).toBe(false)
      expect(seen).toEqual([0, 0, 0])
    })
  }
})

describe('P2 RetryOnError: promise / weak carriers inside context', () => {
  for (const [name, run] of paths) {
    it(`[${name}] plain object containing a Promise: done must be called (no hang, no unhandled rejection)`, async () => {
      const before = unhandled.length
      const stage = new RetryOnError<any>({
        retry: 1,
        stage: (ctx: any) => ctx,
      } as any)
      const r = await run(stage, { p: Promise.resolve(1) })
      await new Promise((res) => setTimeout(res, 20))
      // Either a clean result or a callback error is acceptable; silent hang or
      // unhandled rejection is a defect.
      expect(r.hung).toBe(false)
      expect(unhandled.length - before).toBe(0)
    })
  }
})

describe('P2 RetryOnError: exception handling', () => {
  for (const [name, run] of paths) {
    it(`[${name}] retry predicate throws (sync stage): done gets the predicate error`, async () => {
      const stage = new RetryOnError<any>({
        retry: (err: any) => {
          if (err?.message === 'orig') throw new Error('pred')
          return false
        },
        stage: () => {
          throw new Error('orig')
        },
      } as any)
      const r = await run(stage, { n: 0 })
      expect(r.hung).toBe(false)
      expect(String(r.err?.message ?? r.err)).toContain('pred')
    })

    it(`[${name}] retry predicate throws (async stage): done gets the predicate error`, async () => {
      const stage = new RetryOnError<any>({
        retry: () => {
          throw new Error('pred')
        },
        stage: (ctx: any, done: any) => {
          setTimeout(() => done(new Error('orig'), ctx), 0)
        },
      } as any)
      const r = await run(stage, { n: 0 })
      expect(r.hung).toBe(false)
      expect(String(r.err?.message ?? r.err)).toContain('pred')
    })

    it(`[${name}] restore throws on retry: done gets the restore error`, async () => {
      let attempt = 0
      const stage = new RetryOnError<any>({
        retry: 2,
        restore: () => {
          throw new Error('restore-fail')
        },
        stage: (ctx: any) => {
          attempt++
          throw new Error('orig')
        },
      } as any)
      const r = await run(stage, { n: 0 })
      expect(r.hung).toBe(false)
      expect(String(r.err?.message ?? r.err)).toContain('restore-fail')
    })
  }
})

describe('P2 Timeout: exception during snapshot must not also report success', () => {
  it('[interp] Timeout with Promise in ctx: exactly one outcome (throw OR callback)', async () => {
    const calls: string[] = []
    let threw = false
    const stage = new Timeout<any>({ timeout: 50, stage: (c: any) => c } as any)
    try {
      stage.execute({ p: Promise.resolve(1) } as any, (err: any) => {
        calls.push(err ? 'err' : 'ok')
      })
    } catch {
      threw = true
    }
    await new Promise((r) => setTimeout(r, 150))
    expect(threw && calls.length > 0).toBe(false)
  })
})

describe('P2 RetryOnError: attempt count observation (retry=N, always fails)', () => {
  for (const n of [0, 1, 2, 3]) {
    it(`[interp] retry=${n} always-failing stage: count attempts (observation)`, async () => {
      let attempts = 0
      const stage = new RetryOnError<any>({
        retry: n,
        stage: () => {
          attempts++
          throw new Error('fail')
        },
      } as any)
      await runInterp(stage, { n: 0 })
      // Observation only: record actual value; spec does not define N semantics.
      console.log(`OBSERVE interp retry=${n} attempts=${attempts}`)
      expect(attempts).toBeGreaterThan(0)
    })
  }
})
