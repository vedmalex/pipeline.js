import * as publicApi from '../index'
import { Stage } from '../stage'
import { getExecutionSignal } from '../execution_signal'
import { Timeout } from '../timeout'

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('Timeout', function () {
  it('exports execution signal helpers from public API', function (done) {
    expect(publicApi.getExecutionSignal).toBe(getExecutionSignal)
    expect(typeof publicApi.isExecutionAborted).toBe('function')
    expect(typeof publicApi.throwIfExecutionAborted).toBe('function')
    done()
  })

  it('not used without construction', function (done) {
    expect(() => eval('Timeout()')).toThrow()
    done()
  })

  it('not can be used  without confg', function (done) {
    expect(() => {
      new Timeout()
    }).not.toThrow()
    expect(new Timeout()).toBeInstanceOf(Stage)
    done()
  })

  it('works', function (done) {
    var to = new Timeout(function (err, ctx, done) {
      done()
    })
    to.execute({}, function (err, ctx) {
      done()
    })
  })

  it('accept stage instances', function (done) {
    var stg = new Stage(function (err, ctx, done) {
      done()
    })
    var to = new Timeout(stg)
    to.execute({}, function (err, ctx) {
      done()
    })
  })
  
  it('accepts use default overdue', function (done) {
    var to = new Timeout({
      timeout: 100,
      stage: new Stage(function (err, ctx, done) {
        setTimeout(function () {
          done()
        }, 1000)
      }),
    })
    to.execute({}, function (err, ctx) {
      expect(err).toBeNull()
      done()
    })
  })

  it('timeout can be a function!', function (done) {
    var to = new Timeout({
      timeout: function (ctx) {
        return ctx.to
      },
      stage: new Stage(function (err, ctx, done) {
        setTimeout(function () {
          done()
        }, 1000)
      }),
    })
    to.execute(
      {
        to: 1000,
      },
      function (err, ctx) {
        expect(err).toBeNull()
        done()
      },
    )
  })

  it('accepts Stages in config', function (done) {
    var to = new Timeout({
      stage: new Stage(function (err, ctx, done) {
        done()
      }),
      overdue: new Stage(function (err, ctx, done) {
        done()
      }),
    })
    to.execute({}, function (err, ctx) {
      done()
    })
  })

  it('overdue called', function (done) {
    var to = new Timeout({
      timeout: 100,
      stage: function (err, ctx, done) {
        setTimeout(function () {
          done()
        }, 1000)
      },
      overdue: function (err, ctx, done) {
        ctx.overdue = true
        done()
      },
    })
    to.execute({}, function (err, ctx) {
      if (ctx) expect(ctx.overdue).toBeTruthy()
      else throw new Error('context is not defined')
      done()
    })
  })

  it('aborts signal-aware inner stage when timeout fires', async () => {
    let aborted = false

    const to = new Timeout({
      timeout: 10,
      stage: function (_err, ctx, _done) {
        const signal = getExecutionSignal(ctx)
        signal?.addEventListener('abort', () => {
          aborted = true
        }, { once: true })
      },
      overdue: function (_err, ctx, done) {
        ctx.overdue = true
        done(undefined, ctx)
      },
    })

    const result = await to.execute({ overdue: false })

    expect(result.overdue).toBe(true)
    expect(aborted).toBe(true)

    await wait(5)
    expect(aborted).toBe(true)
  })
})
