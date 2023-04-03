import 'jest'

describe('Wrap', function () {
  it('works', function (done) {
    type CTX = {
      FullName: string
      Retry: number
    }
    type WrapCTX = {
      name: string
      count: number
    }
    var ctx = {
      FullName: 'NEO',
      Retry: 1,
    } satisfies CTX

    var st1 = new Stage<CTX>({
      run: function (ctx) {
        ctx.count++
        ctx.name = 'borrow'
      },
    })
    var wr = new Wrap<CTX, WrapCTX>({
      stage: st1,
      prepare: function (ctx: CTX) {
        var retCtx = {
          name: ctx.FullName,
          count: ctx.Retry,
        }
        return retCtx
      },
      finalize: function (ctx: CTX, retCtx: WrapCTX) {
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
    var stage0 = new Stage(function (ctx: SubCTX) {
      ctx.iteration += 1
    })
    var stage = new Wrap<CTX, SubCTX>({
      prepare: function (ctx) {
        return {
          iteration: ctx.iter,
        }
      },
      finalize: function (ctx, retCtx) {
        ctx.iter = retCtx.iteration
      },
      stage: new DoWhile<SubCTX, SubCTX>({
        stage: stage0,
        split: function (ctx, iter) {
          return ctx
        },
        reachEnd: function (err, ctx, iter) {
          return !!err || iter == 10
        },
      }),
    })
    stage.execute(
      {
        iter: 0,
      },
      function (err, context) {
        expect(context?.iter).toEqual(10)
        expect(context?.iteration).toBeUndefined()
        done()
      },
    )
  })
  it('prepare context -> moved to Wrap with fork', function (done) {
    type Ctx = {
      iter: number
    }
    type InternalCtx = {
      iteration: number
    }
    var stage0 = new Stage<InternalCtx>(function (ctx: InternalCtx) {
      ctx.iteration += 1
    })
    var stage = new Wrap<Ctx, InternalCtx>({
      prepare: function (ctx) {
        return ctx.fork({
          iteration: ctx.iter,
        })
      },
      finalize: function (ctx, retCtx) {
        ctx.iter = retCtx.iteration
        expect(retCtx.iteration).toBe(10)
      },
      stage: new DoWhile<InternalCtx, InternalCtx>({
        stage: stage0,
        split: function (ctx, iter) {
          return ctx
        },
        reachEnd: function (err, ctx, iter) {
          return !!err || iter == 10
        },
      } as DoWhileConfig<InternalCtx, InternalCtx>),
    })

    stage.execute(
      {
        iter: 0,
      },
      function (err, context) {
        if (context) {
          expect(context?.iter).toEqual(10)
          // @ts-expect-error
          expect(context?.iteration).toBeUndefined()
          done()
        } else {
          throw Error('nonsense')
        }
      },
    )
  })
})
