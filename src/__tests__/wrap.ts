import 'jest'

import { Context } from '../context'
import { DoWhile } from '../dowhile'
import { Stage } from '../stage'
import { Wrap } from '../wrap'

describe('Wrap', function() {
  it('works', function(done) {
    var st1 = new Stage({
      run: function(ctx) {
        ctx.count++
        ctx.name = 'borrow'
      },
    })
    var wr = new Wrap({
      stage: st1,
      prepare: function(ctx) {
        var retCtx = {
          name: ctx.FullName,
          count: ctx.Retry,
        }
        return retCtx
      },
      finalize: function(ctx, retCtx) {
        ctx.Retry = retCtx.count
        return ctx
      },
    })
    var ctx = {
      FullName: 'NEO',
      Retry: 1,
    }
    wr.execute(ctx, function(err, retCtx) {
      expect(err).toBeUndefined()
      expect(retCtx.Retry).toBe(2)
      expect(retCtx).toEqual(ctx)
      done()
    })
  })

  it('prepare context -> moved to Wrap', function(done) {
    var stage0 = new Stage(function(ctx) {
      ctx.iteration += 1
    })
    var stage = new Wrap({
      prepare: function(ctx) {
        return {
          iteration: ctx.iter,
        }
      },
      finalize: function(ctx, retCtx) {
        ctx.iter = retCtx.iteration
      },
      stage: new DoWhile({
        stage: stage0,
        split: function(ctx, iter) {
          return ctx
        },
        reachEnd: function(err, ctx, iter) {
          return err || iter == 10
        },
      }),
    })
    stage.execute(
      {
        iter: 0,
      },
      function(err, context) {
        expect(context.iter).toEqual(10)
        expect(context.iteration).toBeUndefined()
        done()
      },
    )
  })
  it('prepare context -> moved to Wrap with fork', function(done) {
    var stage0 = new Stage(function(ctx) {
      ctx.iteration += 1
    })
    var stage = new Wrap({
      prepare: function(ctx) {
        return ctx.fork({
          iteration: ctx.iter,
        })
      },
      finalize: function(ctx, retCtx) {
        ctx.iter = retCtx.iteration
        expect(retCtx.iteration).toBe(10)
      },
      stage: new DoWhile({
        stage: stage0,
        split: function(ctx, iter) {
          return ctx
        },
        reachEnd: function(err, ctx, iter) {
          return err || iter == 10
        },
      }),
    })
    stage.execute(
      Context.ensure({
        iter: 0,
      }),
      function(err, context) {
        expect(context.iter).toEqual(10)
        expect(context.iteration).toBeUndefined()
        done()
      },
    )
  })
})
