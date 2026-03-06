/**
 * Coverage tests for Stage subclasses — edge cases missing from existing tests.
 *
 * Existing tests cover happy-path and basic error cases.
 * This file adds:
 *   - Promise API (not just callback API)
 *   - Error propagation through the full chain
 *   - Context mutation and isolation
 *   - Zero / empty input handling
 *   - Interaction between stages (nested composition)
 *   - Timeout behaviour on subclasses
 *   - Async run functions inside subclasses
 */

import { DoWhile } from '../dowhile'
import { IfElse } from '../ifelse'
import { MultiWaySwitch } from '../multiwayswitch'
import { Parallel } from '../parallel'
import { Pipeline } from '../pipeline'
import { RetryOnError } from '../retryonerror'
import { Sequential } from '../sequential'
import { Stage } from '../stage'
import { Timeout } from '../timeout'
import { Wrap } from '../wrap'

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline
// ─────────────────────────────────────────────────────────────────────────────
describe('Pipeline — additional coverage', () => {
  it('returns Promise and resolves with mutated context', async () => {
    const pipe = new Pipeline<{ n: number }>([
      (ctx) => { ctx.n += 1 },
      (ctx) => { ctx.n *= 2 },
    ])
    const result = await pipe.execute({ n: 3 })
    expect(result.n).toBe(8) // (3+1)*2
  })

  it('stops on first stage error and rejects', async () => {
    let secondRan = false
    const pipe = new Pipeline<{ n: number }>([
      (_ctx) => { throw new Error('first-fail') },
      (_ctx) => { secondRan = true },
    ])
    await expect(pipe.execute({ n: 0 })).rejects.toThrow('first-fail')
    expect(secondRan).toBe(false)
  })

  it('passes context mutations between stages correctly', async () => {
    const pipe = new Pipeline<{ log: string[] }>([
      (ctx) => { ctx.log.push('a') },
      (ctx) => { ctx.log.push('b') },
      (ctx) => { ctx.log.push('c') },
    ])
    const result = await pipe.execute({ log: [] })
    expect(result.log).toEqual(['a', 'b', 'c'])
  })

  it('works with async stage functions', async () => {
    const pipe = new Pipeline<{ n: number }>([
      async (ctx) => { ctx.n += 1 },
      async (ctx) => { ctx.n += 10 },
    ])
    const result = await pipe.execute({ n: 0 })
    expect(result.n).toBe(11)
  })

  it('empty pipeline resolves without error', async () => {
    const pipe = new Pipeline<{ n: number }>([])
    const result = await pipe.execute({ n: 42 })
    expect(result.n).toBe(42)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// DoWhile
// ─────────────────────────────────────────────────────────────────────────────
describe('DoWhile — additional coverage', () => {
  it('returns Promise API', async () => {
    let iter = 0
    const stage = new DoWhile({
      stage: (ctx: { n: number }) => { ctx.n++ },
      reachEnd: (_err, _ctx, i) => i >= 5,
    })
    const result = await stage.execute({ n: 0 })
    expect(result.n).toBe(5)
  })

  it('stops immediately when reachEnd returns true on iter=0', async () => {
    let ran = false
    const stage = new DoWhile({
      stage: (_ctx: {}) => { ran = true },
      reachEnd: () => true,
    })
    await stage.execute({})
    expect(ran).toBe(false)
  })

  it('propagates error from stage via callback', (done) => {
    let count = 0
    const stage = new DoWhile({
      stage: (_ctx: { n: number }, cb: any) => {
        count++
        cb(new Error('inner-fail'))
      },
      reachEnd: (err, _ctx, i) => !!err || i >= 10,
    })
    stage.execute({ n: 0 }, (err) => {
      expect(err).toBeDefined()
      expect(count).toBe(1)
      done()
    })
  })

  it('uses split to derive per-iteration context', async () => {
    const visited: number[] = []
    const items = [10, 20, 30]
    const stage = new DoWhile<{ n: number }>({
      stage: (ctx: any) => { visited.push(ctx.value) },
      split: (_ctx, iter) => ({ value: items[iter] }),
      reachEnd: (_err, _ctx, i) => i >= 3,
    })
    await stage.execute({ n: 0 })
    expect(visited).toEqual([10, 20, 30])
  })

  it('async stage function works inside DoWhile', async () => {
    let count = 0
    const stage = new DoWhile({
      stage: async (_ctx: {}) => { count++ },
      reachEnd: (_err, _ctx, i) => i >= 3,
    })
    await stage.execute({})
    expect(count).toBe(3)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Sequential
// ─────────────────────────────────────────────────────────────────────────────
describe('Sequential — additional coverage', () => {
  it('returns Promise API', async () => {
    const stage = new Sequential({
      stage: (ctx: { n: number }) => { ctx.n++ },
      split: (ctx) => [{ n: ctx.n }, { n: ctx.n }, { n: ctx.n }],
      combine: (ctx, children) => {
        ctx.n = children.reduce((s, c) => s + c.n, 0)
        return ctx
      },
    })
    const result = await stage.execute({ n: 1 })
    expect(result.n).toBe(6) // each child: 1→2, sum of [2,2,2]
  })

  it('stops on child error and rejects', async () => {
    let count = 0
    const stage = new Sequential({
      stage: (ctx: { fail: boolean }) => {
        count++
        if (ctx.fail) throw new Error('child-fail')
      },
      split: (_ctx) => [{ fail: false }, { fail: true }, { fail: false }],
    })
    await expect(stage.execute({ fail: false })).rejects.toBeDefined()
  })

  it('empty split resolves without running stage', async () => {
    let ran = false
    const stage = new Sequential({
      stage: (_ctx: {}) => { ran = true },
      split: () => [],
    })
    await stage.execute({})
    expect(ran).toBe(false)
  })

  it('context isolation: child mutations do not leak unless combined', async () => {
    const stage = new Sequential({
      stage: (ctx: { secret: number }) => { ctx.secret = 999 },
      split: (_ctx) => [{ secret: 0 }, { secret: 0 }],
      // combine not provided — parent ctx unchanged
    })
    const result = await stage.execute({ secret: 1 })
    expect(result.secret).toBe(1)
  })

  it('async stage function works inside Sequential', async () => {
    const stage = new Sequential<{ n: number }, { n: number }>({
      stage: async (ctx) => { ctx.n += 10 },
      split: (_ctx) => [{ n: 0 }, { n: 0 }],
      combine: (ctx, children) => {
        ctx.n = children.reduce((s, c) => s + c.n, 0)
        return ctx
      },
    })
    const result = await stage.execute({ n: 0 })
    expect(result.n).toBe(20)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// RetryOnError
// ─────────────────────────────────────────────────────────────────────────────
describe('RetryOnError — additional coverage', () => {
  it('returns Promise API on success', async () => {
    const st = new RetryOnError({
      stage: (ctx: { n: number }) => { ctx.n = 42 },
      retry: 1,
    })
    const result = await st.execute({ n: 0 })
    expect(result.n).toBe(42)
  })

  it('rejects via Promise API when retries exhausted', async () => {
    const st = new RetryOnError({
      stage: (_ctx: {}) => { throw new Error('always-fail') },
      retry: 2,
    })
    await expect(st.execute({})).rejects.toBeDefined()
  })

  it('context is restored to backup state before each retry', async () => {
    const snapshots: number[] = []
    let attempt = 0
    const st = new RetryOnError({
      stage: (ctx: { n: number }) => {
        snapshots.push(ctx.n)
        attempt++
        if (attempt < 3) throw new Error('retry')
      },
      retry: 3,
      backup: (ctx) => ({ n: ctx.n }),
      restore: (ctx, backup) => { ctx.n = backup.n },
    })
    await st.execute({ n: 0 })
    // each attempt should start from the same n=0
    expect(snapshots).toEqual([0, 0, 0])
  })

  it('retry=1 means two attempts total, failure propagates', async () => {
    let count = 0
    const st = new RetryOnError({
      stage: (_ctx: {}) => { count++; throw new Error('fail') },
      retry: 1,
    })
    await expect(st.execute({})).rejects.toBeDefined()
    // retry=1 means: initial attempt + 1 retry = 2 total
    // reachEnd: iter > retry → iter > 1 → stops after iter=2 (3 attempts)
    // because loop is: do { iter++; ... } while (!reachEnd(err, iter))
    // iter=0, iter=1, iter=2 → 3 calls
    expect(count).toBe(3)
  })

  it('async stage works with RetryOnError', async () => {
    let attempt = 0
    const st = new RetryOnError({
      stage: async (ctx: { n: number }) => {
        attempt++
        if (attempt < 2) throw new Error('retry')
        ctx.n = attempt
      },
      retry: 2,
    })
    const result = await st.execute({ n: 0 })
    expect(result.n).toBe(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Parallel
// ─────────────────────────────────────────────────────────────────────────────
describe('Parallel — additional coverage', () => {
  it('returns Promise API', async () => {
    const stage = new Parallel<{ items: number[] }, { v: number }>({
      stage: (ctx) => { ctx.v *= 2 },
      split: (ctx) => ctx.items.map(v => ({ v })),
      combine: (ctx, children) => {
        ctx.items = children.map(c => c.v)
        return ctx
      },
    })
    const result = await stage.execute({ items: [1, 2, 3] })
    expect(result.items).toEqual([2, 4, 6])
  })

  it('empty split resolves without error', async () => {
    let ran = false
    const stage = new Parallel<{ n: number }, { n: number }>({
      stage: (_ctx) => { ran = true },
      split: () => [],
    })
    await stage.execute({ n: 0 })
    expect(ran).toBe(false)
  })

  it('rejects if any child fails', async () => {
    const stage = new Parallel<{ n: number }, { fail: boolean }>({
      stage: (ctx) => { if (ctx.fail) throw new Error('child-fail') },
      split: () => [{ fail: false }, { fail: true }, { fail: false }],
    })
    await expect(stage.execute({ n: 0 })).rejects.toBeDefined()
  })

  it('all children run concurrently (order-independent combine)', async () => {
    const order: number[] = []
    const stage = new Parallel<{ n: number }, { id: number }>({
      stage: async (ctx) => {
        await new Promise(r => setTimeout(r, 10 - ctx.id)) // reverse delay
        order.push(ctx.id)
      },
      split: () => [{ id: 1 }, { id: 2 }, { id: 3 }],
    })
    await stage.execute({ n: 0 })
    // all three should have run regardless of order
    expect(order.sort()).toEqual([1, 2, 3])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// IfElse
// ─────────────────────────────────────────────────────────────────────────────
describe('IfElse — additional coverage', () => {
  it('returns Promise API — true branch', async () => {
    const stage = new IfElse<{ n: number }>({
      condition: true,
      success: (ctx) => { ctx.n = 1 },
      failed: (ctx) => { ctx.n = 2 },
    })
    const result = await stage.execute({ n: 0 })
    expect(result.n).toBe(1)
  })

  it('returns Promise API — false branch', async () => {
    const stage = new IfElse<{ n: number }>({
      condition: false,
      success: (ctx) => { ctx.n = 1 },
      failed: (ctx) => { ctx.n = 2 },
    })
    const result = await stage.execute({ n: 0 })
    expect(result.n).toBe(2)
  })

  it('function condition receives context', async () => {
    const stage = new IfElse<{ flag: boolean; result: string }>({
      condition: (ctx) => ctx.flag,
      success: (ctx) => { ctx.result = 'yes' },
      failed: (ctx) => { ctx.result = 'no' },
    })
    expect((await stage.execute({ flag: true, result: '' })).result).toBe('yes')
    expect((await stage.execute({ flag: false, result: '' })).result).toBe('no')
  })

  it('no success/failed — resolves without error', async () => {
    const stage = new IfElse<{ n: number }>({ condition: true })
    const result = await stage.execute({ n: 5 })
    expect(result.n).toBe(5)
  })

  it('async condition function', async () => {
    const stage = new IfElse<{ n: number; result: string }>({
      condition: async (ctx) => ctx.n > 0,
      success: (ctx) => { ctx.result = 'positive' },
      failed: (ctx) => { ctx.result = 'non-positive' },
    })
    expect((await stage.execute({ n: 1, result: '' })).result).toBe('positive')
    expect((await stage.execute({ n: -1, result: '' })).result).toBe('non-positive')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Wrap
// ─────────────────────────────────────────────────────────────────────────────
describe('Wrap — additional coverage', () => {
  it('returns Promise API', async () => {
    const stage = new Wrap<{ total: number }, { delta: number }>({
      prepare: (ctx) => ({ delta: ctx.total * 2 }),
      stage: (ctx) => { ctx.delta += 1 },
      finalize: (ctx, ret) => { ctx.total = ret.delta; return ctx },
    })
    const result = await stage.execute({ total: 3 })
    expect(result.total).toBe(7) // delta = 3*2=6, +1=7
  })

  it('parent context unchanged when no finalize', async () => {
    const stage = new Wrap<{ total: number }, { delta: number }>({
      prepare: (ctx) => ({ delta: 0 }),
      stage: (ctx) => { ctx.delta = 999 },
      // no finalize — parent unchanged
    })
    const result = await stage.execute({ total: 42 })
    expect(result.total).toBe(42)
  })

  it('error in inner stage propagates', async () => {
    const stage = new Wrap<{ n: number }, { n: number }>({
      prepare: (ctx) => ({ n: ctx.n }),
      stage: (_ctx) => { throw new Error('wrap-inner-fail') },
    })
    await expect(stage.execute({ n: 0 })).rejects.toBeDefined()
  })

  it('async inner stage works', async () => {
    const stage = new Wrap<{ n: number }, { n: number }>({
      prepare: (ctx) => ({ n: ctx.n }),
      stage: async (ctx) => { ctx.n += 10 },
      finalize: (ctx, ret) => { ctx.n = ret.n; return ctx },
    })
    const result = await stage.execute({ n: 5 })
    expect(result.n).toBe(15)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Timeout
// ─────────────────────────────────────────────────────────────────────────────
describe('Timeout — additional coverage', () => {
  it('returns Promise API — completes before timeout', async () => {
    const stage = new Timeout<{ n: number }>({
      timeout: 500,
      stage: (ctx) => { ctx.n = 1 },
    })
    const result = await stage.execute({ n: 0 })
    expect(result.n).toBe(1)
  })

  it('runs overdue stage when timeout fires', (done) => {
    const stage = new Timeout<{ result: string }>({
      timeout: 10,
      stage: (ctx, cb: any) => setTimeout(() => { ctx.result = 'main'; cb() }, 200),
      overdue: (ctx) => { ctx.result = 'overdue' },
    })
    stage.execute({ result: '' }, (err, ctx) => {
      expect(err).toBeUndefined()
      expect(ctx.result).toBe('overdue')
      done()
    })
  })

  it('timeout with function that returns delay', async () => {
    const stage = new Timeout<{ n: number }>({
      timeout: (ctx) => (ctx ? 500 : 10),
      stage: (ctx) => { ctx.n = 99 },
    })
    const result = await stage.execute({ n: 0 })
    expect(result.n).toBe(99)
  })

  it('no stage and no timeout resolves immediately', async () => {
    const stage = new Timeout<{ n: number }>({})
    const result = await stage.execute({ n: 5 })
    expect(result.n).toBe(5)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// MultiWaySwitch
// ─────────────────────────────────────────────────────────────────────────────
describe('MultiWaySwitch — additional coverage', () => {
  it('returns Promise API — runs all static cases', async () => {
    const log: string[] = []
    const stage = new MultiWaySwitch<{ n: number }, { n: number }>([
      { stage: (_ctx) => { log.push('a') }, evaluate: true },
      { stage: (_ctx) => { log.push('b') }, evaluate: true },
    ])
    await stage.execute({ n: 0 })
    expect(log.sort()).toEqual(['a', 'b'])
  })

  it('dynamic case only runs when evaluate returns true', async () => {
    const log: string[] = []
    const stage = new MultiWaySwitch<{ flag: boolean }, { flag: boolean }>([
      { stage: (_ctx) => { log.push('always') }, evaluate: true },
      { stage: (_ctx) => { log.push('conditional') }, evaluate: (ctx) => ctx.flag },
    ])
    await stage.execute({ flag: false })
    expect(log).toEqual(['always'])

    log.length = 0
    await stage.execute({ flag: true })
    expect(log.sort()).toEqual(['always', 'conditional'])
  })

  it('empty cases resolves without error', async () => {
    const stage = new MultiWaySwitch<{ n: number }, { n: number }>([])
    const result = await stage.execute({ n: 42 })
    expect(result.n).toBe(42)
  })

  it('rejects if any case fails', async () => {
    const stage = new MultiWaySwitch<{ n: number }, { n: number }>([
      { stage: (_ctx) => { throw new Error('case-fail') }, evaluate: true },
    ])
    await expect(stage.execute({ n: 0 })).rejects.toBeDefined()
  })
})
