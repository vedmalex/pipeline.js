import 'jest'
import { Stage } from '../../stage'
import { DoWhile, DoWhileConfig } from '../dowhile'
import { Wrap } from './wrap'

describe('Wrap', function () {
  it('works', function (done) {
    var ctx = {
      FullName: 'NEO',
      Retry: 1,
    }

    var wr = new Wrap({
      stage: new Stage({
        run: function (ctx) {
          ctx.count++
          ctx.name = 'borrow'
        },
      }),
      prepare: function (ctx) {
        var retCtx = {
          name: ctx.FullName,
          count: ctx.Retry,
        }
        return retCtx
      },
      finalize: function (ctx, retCtx) {
        ctx.Retry = retCtx.count
        return ctx
      },
    })

    wr.execute(ctx, function (err, retCtx) {
      expect(err).toBeUndefined()
      expect(retCtx?.Retry).toBe(2)
      expect(retCtx).toEqual(ctx)
      done()
    })
  })

  it('prepare context -> moved to Wrap', function (done) {
    type CTX = { iteration: number; iter: number }
    type SubCTX = { iteration: number }
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
      stage: new DoWhile({
        stage: new Stage({
          run: function (ctx: SubCTX) {
            ctx.iteration += 1
          },
        }),
        split: function (ctx, iter) {
          return ctx
        },
        reachEnd: function (err, ctx, iter) {
          return !!err || iter == 10
        },
      }),
    })
    stage.execute({
      iter: 0,
    }, function (err, context) {
      expect(context?.iter).toEqual(10)
      expect(context?.iteration).toBeUndefined()
      done()
    })
  })
  it('prepare context -> moved to Wrap with fork', function (done) {
    var stage = new Wrap({
      prepare: function (ctx) {
        return ctx.fork({
          iteration: ctx.iter,
        })
      },
      finalize: function (ctx, retCtx) {
        ctx.iter = retCtx.iteration
        expect(retCtx.iteration).toBe(10)
        return ctx
      },
      stage: new DoWhile({
        stage: new Stage({
          run: function (ctx) {
            ctx.iteration += 1
          },
        }),
        split: function (ctx, iter) {
          return ctx
        },
        reachEnd: function (err, ctx, iter) {
          return !!err || iter == 10
        },
      }),
    })

    stage.execute({
      iter: 0,
    }, function (err, context) {
      if (context) {
        expect(context?.iter).toEqual(10)
        // @ts-expect-error
        expect(context?.iteration).toBeUndefined()
        done()
      } else {
        throw Error('nonsense')
      }
    })
  })
})
