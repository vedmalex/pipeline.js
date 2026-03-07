import { Context } from '../context'
import { getExecutionSignal } from '../execution_signal'
import { Parallel } from '../parallel'
import { Stage } from '../stage'
import { Wrap } from '../wrap'
import { isAnyStage } from '../utils/types'
import { CleanError } from '../utils/ErrorList'

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('Parallel', function () {
  it('works with default', function (done) {
    var stage = new Parallel()
    expect(isAnyStage(stage)).toBeTruthy()
    stage.execute({}, function (err, context) {
      expect(err).toBeUndefined()
      done()
    })
  })

  it('accept config', function (done) {
    var st = new Stage()
    var pp = new Parallel(st)
    expect(st === pp.config.stage).toBeTruthy()
    done()
  })

  it('accept config', function (done) {
    var st = function (err, ctx, done) {}
    var pp = new Parallel({
      stage: st,
    })
    expect(st === pp.config.stage).toBeTruthy()
    done()
  })

  it('run stage', function (done) {
    var stage0 = new Stage(function (err, ctx, done) {
      ctx.iter++
      done()
    })
    var stage = new Parallel({
      stage: stage0,
    })
    stage.execute(
      {
        iter: 1,
      },
      function (err, context) {
        expect(context.iter).toEqual(2)
        done()
      },
    )
  })

  it('empty split not run combine', function (done) {
    var stage0 = new Stage(function (ctx) {})
    var stage = new Parallel({
      stage: stage0,
      split: function (ctx) {
        return []
      },
      combine: function (ctx, children) {
        ctx.combine = true
        return ctx
      },
    })

    stage.execute({}, function (err, context) {
      expect(!context.combine).toEqual(true)
      done()
    })
  })

  it('run with empty result of split', function (done) {
    var stage0 = new Stage(function (err, ctx, done) {
      ctx.iter++
      done()
    })
    var stage = new Parallel({
      stage: stage0,
      split: function () {
        return null
      },
    })
    stage.execute(
      {
        iter: 1,
      },
      function (err, context) {
        expect(context.iter).toEqual(1)
        done()
      },
    )
  })

  it('complex example 1', function (done) {
    var stage0 = new Stage(function (err, ctx, done) {
      ctx.liter = 1
      done()
    })
    var ctx = {
      some: [1, 2, 3, 4, 5, 6, 7],
    }
    var stage = new Parallel({
      stage: stage0,
      split: function (ctx, iter) {
        var res = []
        var len = ctx.some.length
        for (var i = 0; i < len; i++) {
          res.push({
            some: ctx.some[i],
          })
        }
        return res
      },
      combine: function (ctx, childs) {
        var len = childs.length
        ctx.result = 0
        for (var i = 0; i < len; i++) {
          ctx.result += childs[i].liter
        }
      },
    })
    stage.execute(ctx, function (err, context) {
      expect(context.result).toEqual(7)
      done()
    })
  })

  it('complex example 1 - Error Handling', function (done) {
    var stage0 = new Stage(function (err, ctx, done) {
      ctx.liter = 1
      if (ctx.some == 4) done(new Error('4'))
      else if (ctx.some == 5) done(new Error('5'))
      else done()
    })
    var ctx = {
      some: [1, 2, 3, 4, 5, 6, 7],
    }
    var stage = new Parallel({
      stage: stage0,
      split: function (ctx, iter) {
        var res = []
        var len = ctx.some.length
        for (var i = 0; i < len; i++) {
          res.push({
            some: ctx.some[i],
          })
        }
        return res
      },
      combine: function (ctx, childs) {
        var len = childs.length
        ctx.result = 0
        for (var i = 0; i < len; i++) {
          ctx.result += childs[i].liter
        }
      },
    })
    stage.execute(ctx, function (err, context) {
      expect(err instanceof CleanError).toEqual(true)
      expect(err.chain.primary.message).toEqual('parallel - error')
      expect(err.chain.secondary.length).toEqual(1)
      expect(err.chain.secondary[0].message).toEqual('parallel - error')
      expect(!context.result).toEqual(true)
      done()
    })
  })

  it('complex example 2', function (done) {
    var stage0 = new Stage(function (err, ctx, done) {
      ctx.liter = 1
      done()
    })
    var ctx = Context.ensure({
      some: [1, 2, 3, 4, 5, 6, 7],
    })
    var stage = new Parallel({
      stage: stage0,
      split: function (ctx, iter) {
        var res = []
        var len = ctx.some.length
        for (var i = 0; i < len; i++) {
          res.push(ctx.fork())
        }
        return res
      },
      combine: function (ctx, children) {
        var childs = children
        var len = childs.length
        ctx.result = 0
        for (var i = 0; i < len; i++) {
          ctx.result += childs[i].liter
        }
      },
    })

    stage.execute(ctx, function (err, context) {
      expect(context.result).toEqual(7)
      done()
    })
  })

  it('prepare context -> moved to Wrap', function (done) {
    var stage0 = new Stage(function (ctx) {
      ctx.iteration++
    })
    var stage = new Wrap({
      prepare: function (ctx) {
        return {
          iteration: ctx.iter,
        }
      },
      finalize: function (ctx, retCtx) {
        ctx.iter = retCtx.iteration
      },
      stage: new Parallel({
        stage: stage0,
        split: function (ctx) {
          ctx.split = [0, 0, 0, 0, 0]
          ctx.split = ctx.split.map(function (i) {
            return {
              iteration: 0,
            }
          })
          return ctx.split
        },
        combine: function (ctx, children) {
          ctx.iteration = children.reduce(function (p, c, i, a) {
            return p + c.iteration
          }, 0)
          delete ctx.split
          return ctx
        },
      }),
    })

    stage.execute(
      {
        iter: 0,
      },
      function (err, context) {
        // throw Error()
        expect(err).toBeUndefined()
        expect(context.iter).toEqual(5)
        expect(context.iteration).toBeUndefined()
        done()
      },
    )
  })

  it('respects concurrency: 1 in legacy runtime', async () => {
    let active = 0
    let peak = 0

    const stage = new Parallel<{ done: number[] }, { id: number; done?: boolean }>({
      concurrency: 1,
      stage: async (ctx) => {
        active += 1
        peak = Math.max(peak, active)
        await wait(10)
        active -= 1
        ctx.done = true
      },
      split: () => [{ id: 1 }, { id: 2 }, { id: 3 }],
      combine: (ctx, children) => {
        ctx.done = children.filter((child) => child.done).map((child) => child.id)
        return ctx
      },
    })

    const result = await stage.execute({ done: [] })

    expect(result.done).toEqual([1, 2, 3])
    expect(peak).toBe(1)
  })

  it('respects concurrency: 2 in legacy runtime', async () => {
    let active = 0
    let peak = 0

    const stage = new Parallel<{ done: number[] }, { id: number; done?: boolean }>({
      concurrency: 2,
      stage: async (ctx) => {
        active += 1
        peak = Math.max(peak, active)
        await wait(10)
        active -= 1
        ctx.done = true
      },
      split: () => [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
      combine: (ctx, children) => {
        ctx.done = children.filter((child) => child.done).map((child) => child.id)
        return ctx
      },
    })

    const result = await stage.execute({ done: [] })

    expect(result.done).toEqual([1, 2, 3, 4])
    expect(peak).toBeLessThanOrEqual(2)
    expect(peak).toBeGreaterThan(1)
  })

  it('join:any resolves on first success in legacy runtime', async () => {
    const started: number[] = []

    const stage = new Parallel<
      { winners: number[]; winner?: boolean },
      { id: number; winner?: boolean }
    >({
      concurrency: 1,
      join: 'any',
      stage: async (ctx) => {
        started.push(ctx.id)
        return { id: ctx.id, winner: true }
      },
      split: () => [{ id: 1 }, { id: 2 }],
      combine: (ctx, children) => {
        ctx.winners = children.map((child) => child.id)
        ctx.winner = children[0]?.winner === true
        return ctx
      },
    })

    const result = await stage.execute({ winners: [] })

    expect(result.winners).toEqual([1])
    expect(result.winner).toBe(true)
    expect(started).toEqual([1])
  })

  it('join:any fails if all children fail in legacy runtime', async () => {
    const stage = new Parallel<{ n: number }, { id: number }>({
      join: 'any',
      stage: (ctx) => {
        throw new Error(`fail-${ctx.id}`)
      },
      split: () => [{ id: 1 }, { id: 2 }],
    })

    const err: any = await stage.execute({ n: 0 }).catch((error) => error)

    expect(err.chain.primary.message).toBe('parallel - error')
    expect(err.chain.secondary.length).toBe(1)
  })

  it('join:quorum resolves when threshold is reached in legacy runtime', async () => {
    const started: number[] = []

    const stage = new Parallel<
      { winners: number[] },
      { id: number; winner?: boolean }
    >({
      concurrency: 2,
      join: 'quorum',
      quorum: 2,
      stage: async (ctx) => {
        started.push(ctx.id)
        return { id: ctx.id, winner: true }
      },
      split: () => [{ id: 1 }, { id: 2 }, { id: 3 }],
      combine: (ctx, children) => {
        ctx.winners = children.map((child) => child.id)
        return ctx
      },
    })

    const result = await stage.execute({ winners: [] })

    expect(result.winners).toEqual([1, 2])
    expect(started.slice(0, 2)).toEqual([1, 2])
    expect(started.length).toBeGreaterThanOrEqual(2)
    expect(started.length).toBeLessThanOrEqual(3)
  })

  it('join:quorum fails if threshold is not reached in legacy runtime', async () => {
    const stage = new Parallel<{ n: number }, { id: number }>({
      join: 'quorum',
      quorum: 3,
      stage: (ctx) => {
        if (ctx.id !== 1) {
          throw new Error(`fail-${ctx.id}`)
        }
        return { id: ctx.id }
      },
      split: () => [{ id: 1 }, { id: 2 }, { id: 3 }],
    })

    const err: any = await stage.execute({ n: 0 }).catch((error) => error)

    expect(err.chain.primary.message).toBe('parallel - error')
    expect(err.chain.secondary.length).toBe(1)
  })

  it('join:any can drain active trailing branches in legacy runtime', async () => {
    const started: number[] = []
    const finished: number[] = []

    const stage = new Parallel<
      { winners: number[] },
      { id: number; winner?: boolean }
    >({
      concurrency: 2,
      join: 'any',
      trailing: 'drain-active',
      stage: async (ctx) => {
        started.push(ctx.id)
        await wait(ctx.id === 1 ? 5 : 15)
        finished.push(ctx.id)
        return { id: ctx.id, winner: true }
      },
      split: () => [{ id: 1 }, { id: 2 }, { id: 3 }],
      combine: (ctx, children) => {
        ctx.winners = children.map((child) => child.id)
        return ctx
      },
    })

    const result = await stage.execute({ winners: [] })

    expect(started).toEqual([1, 2])
    expect(finished).toEqual([1, 2])
    expect(result.winners).toEqual([1, 2])
  })

  it('join:quorum can drain active trailing branches in legacy runtime', async () => {
    const started: number[] = []

    const stage = new Parallel<
      { winners: number[] },
      { id: number; winner?: boolean }
    >({
      concurrency: 4,
      join: 'quorum',
      quorum: 2,
      trailing: 'drain-active',
      stage: async (ctx) => {
        started.push(ctx.id)
        await wait(ctx.id >= 3 ? 15 : 5)
        return { id: ctx.id, winner: true }
      },
      split: () => [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
      combine: (ctx, children) => {
        ctx.winners = children.map((child) => child.id)
        return ctx
      },
    })

    const result = await stage.execute({ winners: [] })

    expect(started).toEqual([1, 2, 3, 4])
    expect(result.winners).toEqual([1, 2, 3, 4])
  })

  it('join:any can time-bound active trailing drain in legacy runtime', async () => {
    const started: number[] = []
    const finished: number[] = []

    const stage = new Parallel<
      { winners: number[] },
      { id: number; winner?: boolean }
    >({
      concurrency: 2,
      join: 'any',
      trailing: 'drain-active',
      trailingTimeout: 5,
      stage: async (ctx) => {
        started.push(ctx.id)
        await wait(ctx.id === 1 ? 5 : 40)
        finished.push(ctx.id)
        return { id: ctx.id, winner: true }
      },
      split: () => [{ id: 1 }, { id: 2 }, { id: 3 }],
      combine: (ctx, children) => {
        ctx.winners = children.map((child) => child.id)
        return ctx
      },
    })

    const result = await stage.execute({ winners: [] })

    expect(started).toEqual([1, 2])
    expect(finished).toEqual([1])
    expect(result.winners).toEqual([1])

    await wait(50)
    expect(finished).toEqual([1, 2])
  })

  it('join:any aborts active branches on early success in legacy runtime', async () => {
    const started: number[] = []
    const finished: number[] = []
    const aborted: number[] = []

    const stage = new Parallel<
      { winners: number[] },
      { id: number; winner?: boolean; aborted?: boolean }
    >({
      concurrency: 2,
      join: 'any',
      stage: function (_err, ctx, done) {
        started.push(ctx.id)

        if (ctx.id === 1) {
          setTimeout(() => {
            done(undefined, { id: ctx.id, winner: true })
          }, 5)
          return
        }

        const signal = getExecutionSignal(ctx)
        const timer = setTimeout(() => {
          finished.push(ctx.id)
          done(undefined, { id: ctx.id, winner: true })
        }, 40)

        signal?.addEventListener('abort', () => {
          aborted.push(ctx.id)
          clearTimeout(timer)
          done(undefined, { id: ctx.id, aborted: true })
        }, { once: true })
      },
      split: () => [{ id: 1 }, { id: 2 }, { id: 3 }],
      combine: (ctx, children) => {
        ctx.winners = children.map((child) => child.id)
        return ctx
      },
    })

    const result = await stage.execute({ winners: [] })

    expect(result.winners).toEqual([1])
    expect(started).toEqual([1, 2])
    expect(aborted).toEqual([2])

    await wait(50)
    expect(finished).toEqual([])
  })

  it('join:any aborts active branches after trailing timeout in legacy runtime', async () => {
    const started: number[] = []
    const finished: number[] = []
    const aborted: number[] = []

    const stage = new Parallel<
      { winners: number[] },
      { id: number; winner?: boolean; aborted?: boolean }
    >({
      concurrency: 2,
      join: 'any',
      trailing: 'drain-active',
      trailingTimeout: 5,
      stage: function (_err, ctx, done) {
        started.push(ctx.id)

        if (ctx.id === 1) {
          setTimeout(() => {
            done(undefined, { id: ctx.id, winner: true })
          }, 5)
          return
        }

        const signal = getExecutionSignal(ctx)
        const timer = setTimeout(() => {
          finished.push(ctx.id)
          done(undefined, { id: ctx.id, winner: true })
        }, 40)

        signal?.addEventListener('abort', () => {
          aborted.push(ctx.id)
          clearTimeout(timer)
          done(undefined, { id: ctx.id, aborted: true })
        }, { once: true })
      },
      split: () => [{ id: 1 }, { id: 2 }, { id: 3 }],
      combine: (ctx, children) => {
        ctx.winners = children.map((child) => child.id)
        return ctx
      },
    })

    const result = await stage.execute({ winners: [] })

    expect(result.winners).toEqual([1])
    expect(started).toEqual([1, 2])
    expect(aborted).toEqual([2])

    await wait(50)
    expect(finished).toEqual([])
  })
})
