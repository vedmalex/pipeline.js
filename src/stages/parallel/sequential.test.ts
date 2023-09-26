import 'jest'
import { Stage } from '../../stage'
import { Wrap } from '../wrap/wrap'
import { Sequential } from './Sequential'

describe('Sequential', function () {
  it('works with default', function (done) {
    var stage = new Sequential()
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

  it('works with config as Stage', function (done) {
    var stage = new Sequential(
      new Stage(function (err, ctx, done) {
        done()
      }),
    )
    stage.execute({}, function (err, context) {
      // assert.strictEqual(context instanceof Context, true);
      done()
    })
  })

  it('not allows to use constructor as a function', function (done) {
    try {
      // @ts-expect-error
      var s = Sequential()
    } catch (err) {
      done()
    }
  })

  it('run stage', function (done) {
    type CTX = {
      iter: number
      split?: Array<SplitCTX>
    }
    type SplitCTX = {
      iter: number
    }
    var stage0 = new Stage<SplitCTX>(function (ctx) {
      ctx.iter++
    })
    var stage = new Sequential<CTX, SplitCTX>({
      stage: stage0,
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
    var stage0 = new Stage(function (ctx) {})
    var stage = new Sequential<{ combine: boolean }, {}>({
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
    type SubCTX = { iteration: number }
    type CTX = { iter: number; split?: Array<SubCTX> }
    type SubSubCTX = { iter: number; split?: Array<SubCTX>; iteration: number }
    var stage0 = new Stage(function (ctx: SubCTX) {
      ctx.iteration++
    })
    var stage = new Wrap<CTX, SubCTX>({
      prepare: function (ctx: CTX) {
        return {
          iteration: ctx.iter,
        }
      },
      finalize: function (ctx: CTX, retCtx: SubCTX) {
        ctx.iter = retCtx.iteration
      },
      stage: new Sequential<SubSubCTX, SubCTX>({
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
      // @ts-expect-error
      expect(context?.iteration).toBeUndefined()
      done()
    })
  })
})
