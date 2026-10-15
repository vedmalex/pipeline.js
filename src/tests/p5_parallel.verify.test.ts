import { describe, expect, it } from 'bun:test'
import { getExecutionSignal } from '../execution_signal'
import { Parallel } from '../parallel'
import { __setCompiledPipelineEnabledForTests, Pipeline } from '../pipeline'

// P5 verification: execution-signal stack discipline for Parallel children that
// share ONE carrier object (split returns [ctx, ctx]). Each test asserts the
// contract: the next stage sees the outer execute signal, and it is aborted only
// when the outer signal was aborted. A failing test is a confirmed defect in the
// named path (legacy = parallel.ts, compiled = compiled/executor.ts).

type Mode = 'legacy' | 'compiled'
const MODES: Mode[] = ['legacy', 'compiled']

type Obs = { at: 'start' | 'end'; isOuter: boolean; aborted: boolean; missing: boolean }

function makeParallel(join: 'all' | 'any', delays: number[], shared: boolean) {
  let index = 0
  return new Parallel<any, any>({
    join,
    concurrency: delays.length,
    stage: function (_err: any, ctx: any, done: any) {
      const delay = delays[index++]
      setTimeout(() => done(undefined, ctx), delay)
    },
    split: shared
      ? (ctx: any) => [ctx, ctx]
      : (ctx: any) => delays.map((_, i) => ({ id: i, base: ctx.base })),
    combine: (ctx: any) => ctx,
  } as any)
}

function observer(log: Obs[], ms: number, outer: AbortSignal) {
  const record = (at: 'start' | 'end', ctx: any) => {
    const sig = getExecutionSignal(ctx)
    log.push({
      at,
      isOuter: sig === outer,
      aborted: sig?.aborted ?? false,
      missing: sig === undefined,
    })
  }
  return function (_err: any, ctx: any, done: any) {
    record('start', ctx)
    setTimeout(() => {
      record('end', ctx)
      done(undefined, ctx)
    }, ms)
  }
}

async function run(mode: Mode, stages: any[], ctx: any, signal: AbortSignal) {
  __setCompiledPipelineEnabledForTests(mode === 'compiled')
  try {
    const pipeline = new Pipeline<any>(stages as any)
    await pipeline.execute(ctx, { signal })
    return { rejected: false }
  } catch {
    return { rejected: true }
  } finally {
    __setCompiledPipelineEnabledForTests(undefined)
  }
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('P5 parallel shared-carrier signal stack (verify)', () => {
  for (const mode of MODES) {
    // Control: distinct carriers, join=any, first-bound child is the slow one.
    // Each child owns its carrier, so the outer signal must be visible after.
    it(`[${mode}] control: distinct carriers, join=any, slow first child: next stage sees outer signal`, async () => {
      const outer = new AbortController()
      const log: Obs[] = []
      await run(mode, [makeParallel('any', [30, 10], false), observer(log, 5, outer.signal)], { base: 1 }, outer.signal)
      await wait(50)
      expect(log[0]).toEqual({ at: 'start', isOuter: true, aborted: false, missing: false })
    })

    // Shared carrier, join=all, A,B order (child bound first finishes first).
    // Child0 restores outer; child1 then restores child0's signal onto the carrier.
    it(`[${mode}] shared carrier, join=all, A,B order: next stage sees outer signal`, async () => {
      const outer = new AbortController()
      const log: Obs[] = []
      await run(mode, [makeParallel('all', [10, 30], true), observer(log, 5, outer.signal)], { base: 1 }, outer.signal)
      await wait(50)
      expect(log[0]).toEqual({ at: 'start', isOuter: true, aborted: false, missing: false })
    })

    // Shared carrier, join=all, B,A order: LIFO-compatible, must pass.
    it(`[${mode}] shared carrier, join=all, B,A order: next stage sees outer signal`, async () => {
      const outer = new AbortController()
      const log: Obs[] = []
      await run(mode, [makeParallel('all', [30, 10], true), observer(log, 5, outer.signal)], { base: 1 }, outer.signal)
      await wait(50)
      expect(log[0]).toEqual({ at: 'start', isOuter: true, aborted: false, missing: false })
    })

    // Shared carrier, join=any. Child1 (bound second, previous = child0's signal C0)
    // wins first. Its restore re-installs C0 on the carrier, then abortActiveChildren
    // aborts C0. The next stage starts with an ABORTED signal, though outer was never aborted.
    it(`[${mode}] shared carrier, join=any, second-bound child wins: next stage not spuriously aborted`, async () => {
      const outer = new AbortController()
      const log: Obs[] = []
      await run(mode, [makeParallel('any', [30, 10], true), observer(log, 5, outer.signal)], { base: 1 }, outer.signal)
      await wait(50)
      expect(log[0]).toEqual({ at: 'start', isOuter: true, aborted: false, missing: false })
    })

    // Shared carrier, join=any. Child0 wins first (restores outer, aborts child1).
    // Child1 settles late and re-installs child0's signal C0, which was unlinked from
    // outer on settle. Outer abort at t=20 must reach the next stage, which samples at t=50.
    it(`[${mode}] shared carrier, join=any, late loser leaves stale signal: outer abort reaches next stage`, async () => {
      const outer = new AbortController()
      const log: Obs[] = []
      setTimeout(() => outer.abort(), 20)
      await run(mode, [makeParallel('any', [10, 30], true), observer(log, 40, outer.signal)], { base: 1 }, outer.signal)
      await wait(60)
      expect(log[1]).toEqual({ at: 'end', isOuter: true, aborted: true, missing: false })
    })
  }
})

describe('P5 parallel child-visible signal (verify)', () => {
  for (const mode of MODES) {
    // join=any, shared carrier: child0 wins at 10ms and aborts child1 (loser).
    // The loser must observe its own abort through getExecutionSignal(ctx) at 20ms.
    // Child0's restore re-installs outer on the carrier before the abort, so the loser sees outer.
    it(`[${mode}] shared carrier, join=any: aborted loser observes its own abort`, async () => {
      const outer = new AbortController()
      const seen: Array<{ aborted: boolean; isOuter: boolean }> = []
      let index = 0
      const par = new Parallel<any, any>({
        join: 'any',
        concurrency: 2,
        stage: function (_err: any, ctx: any, done: any) {
          const me = index++
          if (me === 0) {
            setTimeout(() => done(undefined, ctx), 10)
            return
          }
          setTimeout(() => {
            const sig = getExecutionSignal(ctx)
            seen.push({ aborted: sig?.aborted ?? false, isOuter: sig === outer.signal })
            done(undefined, ctx)
          }, 20)
        },
        split: (ctx: any) => [ctx, ctx],
        combine: (ctx: any) => ctx,
      } as any)
      await run(mode, [par], { base: 1 }, outer.signal)
      await wait(40)
      expect(seen).toEqual([{ aborted: true, isOuter: false }])
    })

    // shared carrier, join=all, A,B order: a running child must see the same
    // signal at completion as it saw at start (its own bound controller).
    it(`[${mode}] shared carrier, join=all, A,B order: child signal stable during its run`, async () => {
      const outer = new AbortController()
      const pairs: Array<{ start: unknown; end: unknown }> = []
      let index = 0
      const par = new Parallel<any, any>({
        join: 'all',
        concurrency: 2,
        stage: function (_err: any, ctx: any, done: any) {
          const me = index++
          const start = getExecutionSignal(ctx)
          const delay = me === 0 ? 10 : 30
          setTimeout(() => {
            pairs.push({ start, end: getExecutionSignal(ctx) })
            done(undefined, ctx)
          }, delay)
        },
        split: (ctx: any) => [ctx, ctx],
        combine: (ctx: any) => ctx,
      } as any)
      await run(mode, [par], { base: 1 }, outer.signal)
      await wait(40)
      expect(pairs.length).toBe(2)
      for (const pair of pairs) {
        expect(pair.end).toBe(pair.start)
      }
    })
  }
})
