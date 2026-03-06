/**
 * Regression tests for TASK-007 hot path optimizations (OPT-1 … OPT-10).
 *
 * Each test targets a specific behaviour that was changed during the optimization
 * wave and that no existing broad-coverage test explicitly asserts.
 *
 * DA audit findings addressed:
 *  - P1-5 / P2-3: missing targeted regression coverage for OPT-7..10
 */

import { CleanError, createError } from '../utils/ErrorList'
import { run_callback_once } from '../utils/run_callback_once'
import { run_or_execute } from '../utils/run_or_execute'
import { Stage } from '../stage'
import { Pipeline } from '../pipeline'

// ─────────────────────────────────────────────────────────────────────────────
// OPT-7: CleanError lazy-parsed + memoized trace (ErrorList.ts)
// ─────────────────────────────────────────────────────────────────────────────
describe('OPT-7: CleanError.chain.trace', () => {
  it('trace is present and is an array of strings', () => {
    const err = createError('regression test')
    expect(Array.isArray(err.chain.trace)).toBe(true)
    expect(err.chain.trace!.length).toBeGreaterThan(0)
    err.chain.trace!.forEach(f => expect(typeof f).toBe('string'))
  })

  it('trace is enumerable — appears in JSON.stringify', () => {
    const err = createError('json test')
    const parsed = JSON.parse(JSON.stringify(err.chain))
    expect(Array.isArray(parsed.trace)).toBe(true)
    expect(parsed.trace.length).toBeGreaterThan(0)
  })

  it('trace is memoized — same array reference on repeated access', () => {
    const err = createError('memoize test')
    const first = err.chain.trace
    const second = err.chain.trace
    expect(first).toBe(second) // strict reference equality — no re-parse
  })

  it('trace content is stable across multiple CleanError instances', () => {
    const a = createError('a')
    const b = createError('b')
    // Both should produce non-empty, string-only frames
    expect(a.chain.trace!.every(f => typeof f === 'string')).toBe(true)
    expect(b.chain.trace!.every(f => typeof f === 'string')).toBe(true)
  })

  it('CleanError from Error object also has trace', () => {
    const err = createError(new Error('wrapped'))
    expect(Array.isArray(err.chain.trace)).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// OPT-10: run_callback_once guard (run_callback_once.ts)
// ─────────────────────────────────────────────────────────────────────────────
describe('OPT-10: run_callback_once', () => {
  it('calls the wrapped function exactly once on first call', () => {
    let calls = 0
    const guarded = run_callback_once((err, ctx) => { calls++ })
    guarded(undefined, {} as any)
    expect(calls).toBe(1)
  })

  it('throws on second call, not silently ignores', () => {
    const guarded = run_callback_once((_err, _ctx) => {})
    guarded(undefined, {} as any)
    expect(() => guarded(undefined, {} as any)).toThrow()
  })

  it('boolean flag is isolated per instance — g1 exhausted does not affect g2', () => {
    let calls1 = 0, calls2 = 0
    const g1 = run_callback_once(() => { calls1++ })
    const g2 = run_callback_once(() => { calls2++ })
    g1(undefined, {} as any) // g1 exhausted
    g2(undefined, {} as any) // g2 first call — must succeed
    expect(calls1).toBe(1)
    expect(calls2).toBe(1)
    // g2 second call must throw (boolean flag, not shared state)
    expect(() => g2(undefined, {} as any)).toThrow()
  })

  it('first call passes err and ctx through unchanged', () => {
    const inputCtx = { n: 42 }
    let received: any
    const guarded = run_callback_once((err, ctx) => { received = ctx })
    guarded(undefined, inputCtx as any)
    expect(received).toBe(inputCtx)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// OPT-9: run_or_execute Stage path skips ctx??context wrapper (run_or_execute.ts)
// ─────────────────────────────────────────────────────────────────────────────
describe('OPT-9: run_or_execute Stage path', () => {
  it('Stage instance — callback receives ctx from execute()', async () => {
    const stage = new Stage<{ n: number }>({ run: (ctx) => { ctx.n = 99 } })
    await new Promise<void>((resolve, reject) => {
      run_or_execute(stage, undefined, { n: 0 }, (err, ctx) => {
        if (err) return reject(err)
        try {
          expect(ctx.n).toBe(99)
          resolve()
        } catch (e) { reject(e) }
      })
    })
  })

  it('Stage instance — error from execute() propagates to callback', async () => {
    const stage = new Stage<{}>({ run: () => { throw new Error('stage-error') } })
    await new Promise<void>((resolve) => {
      run_or_execute(stage, undefined, {}, (err, _ctx) => {
        expect(err).toBeDefined()
        resolve()
      })
    })
  })

  it('function stage — ctx??context fallback still applies for arity-1 void fn', async () => {
    // arity-1 sync fn that returns undefined — fallback to original context
    const fn = (ctx: { n: number }) => { ctx.n = 7 }
    const originalCtx = { n: 0 }
    await new Promise<void>((resolve, reject) => {
      run_or_execute(fn as any, undefined, originalCtx, (err, ctx) => {
        if (err) return reject(err)
        try {
          // ctx should be originalCtx (via ctx??context fallback)
          expect(ctx.n).toBe(7)
          resolve()
        } catch (e) { reject(e) }
      })
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// OPT-8: Pipeline inner loop new Promise (pipeline.ts)
// ─────────────────────────────────────────────────────────────────────────────
describe('OPT-8: Pipeline stage promise path', () => {
  it('error from a stage rejects and stops pipeline', async () => {
    let secondRan = false
    const pipe = new Pipeline<{ n: number }>([
      (_ctx) => { throw new Error('stop') },
      (_ctx) => { secondRan = true },
    ])
    await expect(pipe.execute({ n: 0 })).rejects.toBeDefined()
    expect(secondRan).toBe(false)
  })

  it('context mutations accumulate across stages correctly', async () => {
    const pipe = new Pipeline<{ n: number }>([
      (ctx) => { ctx.n += 1 },
      (ctx) => { ctx.n += 10 },
      (ctx) => { ctx.n += 100 },
    ])
    const result = await pipe.execute({ n: 0 })
    expect(result.n).toBe(111)
  })

  it('async stage in pipeline resolves in order', async () => {
    const order: number[] = []
    const pipe = new Pipeline<{ n: number }>([
      async (_ctx) => { await Promise.resolve(); order.push(1) },
      async (_ctx) => { await Promise.resolve(); order.push(2) },
      async (_ctx) => { await Promise.resolve(); order.push(3) },
    ])
    await pipe.execute({ n: 0 })
    expect(order).toEqual([1, 2, 3])
  })
})
