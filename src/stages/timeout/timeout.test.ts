import 'jest'
import { Stage } from '../../stage'
import { Timeout } from './Timeout'

describe('Timeout', function () {
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
      expect(err).toBeUndefined()
      done()
    })
  })

  it('timeout can be a function!', function (done) {
    var to = new Timeout<{ to: number }>({
      timeout: function (ctx) {
        return ctx.to
      },
      stage: new Stage(function (err, ctx, done) {
        setTimeout(function () {
          done()
        }, 1000)
      }),
    })
    to.execute({
      to: 1000,
    }, function (err, ctx) {
      expect(err).toBeUndefined()
      done()
    })
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
    var to = new Timeout<{ overdue: boolean }>({
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
    to.execute<{ overdue?: boolean }>({}, function (err, ctx) {
      if (ctx) {
        expect(ctx.overdue).toBeTruthy()
      } else {
        throw new Error('context is not defined')
      }
      done()
    })
  })
})
