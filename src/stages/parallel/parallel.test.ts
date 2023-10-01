import 'jest'
import { ComplexError, Context, isAnyStage, Stage } from '../../stage'
import { Wrap } from '../wrap'
import { Parallel } from './parallel'

describe('Parallel', function () {
  it('works with default', function (done) {
    var stage = new Parallel({ stage: new Stage({ run: () => {} }) })
    expect(isAnyStage(stage)).toBeTruthy()
    stage.execute({}, function (err, context) {
      expect(err).toBeUndefined()
      done()
    })
  })

  it('run stage', function (done) {
    var stage0 = new Stage({
      run: function (err, ctx, done) {
        ctx.iter++
        done()
      },
    })
    var stage = new Parallel({
      stage: stage0,
    })
    stage.execute({
      iter: 1,
    }, function (err, context) {
      expect(context?.iter).toEqual(2)
      done()
    })
  })

  it('empty split not run combine', function (done) {
    var stage = new Parallel({
      stage: new Stage({ run: ctx => {} }),
      split: function (ctx) {
        return []
      },
      combine: function (ctx, children) {
        ctx.combine = true
        return ctx
      },
    })

    stage.execute({}, function (err, context) {
      expect(!context?.combine).toEqual(true)
      done()
    })
  })

  it('run with empty result of split', function (done) {
    type CTX = { iter: number }

    var stage0 = new Stage({
      run: function (err, ctx, done) {
        ctx.iter++
        done()
      },
    })
    var stage = new Parallel({
      stage: stage0,
      // @ts-expect-error
      split: function () {},
    })
    stage.execute({
      iter: 1,
    }, function (err, context) {
      expect(context?.iter).toEqual(2)
      done()
    })
  })

  it('complex example 1', function (done) {
    var stage0 = new Stage({
      run: function (err, ctx, done) {
        ctx.liter = 1
        done()
      },
    })
    var ctx = {
      some: [1, 2, 3, 4, 5, 6, 7],
    }

    var stage = new Parallel({
      stage: stage0,
      split: function (ctx) {
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
          ctx.result += childs[i].liter ?? 0
        }
      },
    })
    stage.execute(ctx, function (err, context) {
      expect(context?.result).toEqual(7)
      done()
    })
  })

  it('complex example 1 - Error Handling', function (done) {
    var stage0 = new Stage({
      run: function (err, ctx, done) {
        ctx.liter = 1
        if (ctx.some == 4) {
          done(new Error('4'))
        } else if (ctx.some == 5) {
          done(new Error('5'))
        } else {
          done()
        }
      },
    })
    var ctx = {
      some: [1, 2, 3, 4, 5, 6, 7],
    }
    var stage = new Parallel({
      stage: stage0,
      split: function (ctx) {
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
          ctx.result += childs[i].liter ?? 0
        }
      },
    })
    stage.execute(ctx, function (err, context) {
      expect(err instanceof ComplexError).toEqual(true)
      expect(err.payload.length).toEqual(2)
      expect(context?.result).toEqual(7)
      done()
    })
  })

  it('complex example 2', function (done) {
    var stage0 = new Stage({
      run: function (err, ctx, done) {
        ctx.liter = 1
        done()
      },
    })
    var ctx = Context.ensure({
      some: [1, 2, 3, 4, 5, 6, 7],
    })
    var stage = new Parallel({
      stage: stage0,
      split: function (ctx) {
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
          ctx.result += childs[i].liter ?? 0
        }
      },
    })

    stage.execute(ctx, function (err, context) {
      expect(context?.result).toEqual(7)
      done()
    })
  })

  it('prepare context -> moved to Wrap', function (done) {
    var stage0 = new Stage({
      run: function (ctx) {
        ctx.iteration++
      },
    })
    var stage = new Wrap({
      prepare: function (ctx) {
        return {
          iteration: ctx.iter,
        }
      },
      finalize: function (ctx, retCtx) {
        ctx.iter = retCtx.iteration
        return ctx
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

    stage.execute({
      iter: 0,
    }, function (err, context) {
      // throw Error()
      expect(err).toBeUndefined()
      expect(context?.iter).toEqual(5)
      expect(context?.iteration).toBeUndefined()
      done()
    })
  })
})
