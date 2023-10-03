import 'jest'
import { Stage } from '../../stage'
import { Wrap } from '../wrap'
import { Sequential } from './sequential'

describe('Sequential', function () {
  it('works', function (done) {
    var stage = new Sequential({ stage: new Stage({ run: () => {} }) })
    expect(stage).toBeInstanceOf(Sequential)
    stage.execute({}, function (err, context) {
      expect(err).toBeUndefined()
      done()
    })
  })

  it('rescue', function (done) {
    var st = new Stage({
      run: function (err, ctx, done) {
        throw new Error('error')
      },
      rescue: function (err, conext) {
        if (err.payload[0].message !== 'some') {
          throw err
        }
      },
    })

    var stage = new Sequential({
      stage: st,
      rescue: function (err, conext) {
        if (err.payload[0].message !== 'error') {
          throw err
        }
      },
    })

    stage.execute({}, function (err, ctx) {
      expect(err).toBeUndefined()
      done()
    })
  })

  it('run stage', function (done) {
    var stage = new Sequential({
      stage: new Stage({
        run: function (ctx) {
          ctx.iter++
        },
      }),
      split: function (ctx) {
        ctx.split = [0, 0, 0, 0, 0].map(function (i) {
          return {
            iter: 0,
          }
        })
        return ctx.split
      },
      combine: function (ctx, children) {
        ctx.iter = children.reduce(function (p, c, i, a) {
          return p + c.iter
        }, 0)
        delete ctx.split
        return ctx
      },
    })
    stage.execute({}, function (err, context) {
      expect(context?.iter).toBe(5)
      done()
    })
  })

  it('empty split not run combine', function (done) {
    var stage0 = new Stage({ run: function (ctx) {} })
    var stage = new Sequential({
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
      expect(context?.combine).toBeUndefined()
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
      stage: new Sequential({
        stage: stage0,
        split: function (ctx) {
          ctx.split = [0, 0, 0, 0, 0].map(function (i) {
            return {
              iteration: 0,
            }
          })
          return ctx.split
        },
        combine: function (ctx, children) {
          ctx.iteration = children.reduce(function (p, c) {
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
      expect(err).toBeUndefined()
      expect(context).not.toBeUndefined()
      expect(context?.iter).toEqual(5)
      expect(context?.iteration).toBeUndefined()
      done()
    })
  })
})
