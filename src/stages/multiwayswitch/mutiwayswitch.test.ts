import 'jest'
import { MultiWaySwitch } from './MultiWaySwitch'
import { Context, Stage, StageConfigValidator } from '../../stage'
import { Pipeline } from '../pipeline'

describe('MWS', function () {
  it('works', function (done) {
    var sw = new MultiWaySwitch()
    expect(sw).toBeInstanceOf(Stage)
    sw.execute({}, function (err, ctx) {
      done()
    })
  })

  it('not allows to use constructor as a function', function (done) {
    try {
      var s = eval('MultiWaySwitch()')
    } catch (err) {
      done()
    }
  })

  it('must enter in each pipe works in parallel', function (done) {
    var cnt = 0
    var pipe0 = new Pipeline<{ p00: boolean; p01: boolean }>([
      function (err, ctx, done) {
        if (ctx) ctx.p00 = true
        else throw new Error('nonsense')
        cnt++
        done()
      },
      function (err, ctx, done) {
        if (ctx) ctx.p01 = true
        else throw new Error('nonsense')
        cnt++
        done()
      },
    ])
    var pipe1 = new Pipeline<{ p10: boolean; p11: boolean }>([
      function (err, ctx, done) {
        if (ctx) ctx.p10 = true
        else throw new Error('nonsense')
        cnt++
        done()
      },
      function (err, ctx, done) {
        if (ctx) ctx.p11 = true
        else throw new Error('nonsense')
        cnt++
        done()
      },
    ])
    var pipe2 = new Pipeline<{ p20: boolean; p21: boolean }>({
      stages: [
        function (err, ctx, done) {
          if (ctx) ctx.p20 = true
          else throw new Error('nonsense')
          cnt++
          done()
        },
        function (err, ctx, done) {
          if (ctx) ctx.p21 = true
          else throw new Error('nonsense')
          cnt++
          done()
        },
      ],
    })

    var sw = new MultiWaySwitch([pipe0, pipe1, pipe2])
    sw.execute({}, function (err, ctx) {
      expect(cnt).toEqual(6)
      done()
    })
  })

  it('use trace', function (done) {
    const ctx = Context.ensure({
      trace: true,
    })
    type CTX = typeof ctx
    var sw = new MultiWaySwitch<CTX, CTX>({
      cases: [
        {
          stage: function (err, ctx, done) {
            done()
          },
          evaluate: function () {
            return true
          },
          split: function (ctx) {
            return ctx.fork()
          },
        },
        {
          stage: {
            run: function (err, ctx, done) {
              done()
            },
          } as StageConfig<CTX>,
          evaluate: function () {
            return true
          },
          split: function (ctx) {
            return ctx.fork()
          },
        },
      ],
    })

    sw.execute(ctx, function (err, ctx) {
      done()
    })
  })

  it('use defaults condition as object', function (done) {
    var sw = new MultiWaySwitch({
      cases: [
        {
          stage: function (err, ctx, done) {
            done()
          },
          evaluate: function () {
            return true
          },
        },
        {
          stage: {
            run: function (err, ctx, done) {
              done()
            },
          },
          evaluate: function () {
            return true
          },
        },
      ],
    })

    sw.execute({}, function (err, ctx) {
      done()
    })
  })

  it('must enter in each pipe works in parallel', function (done) {
    type SubCTX = { cnt: number }

    const ctx = Context.ensure({
      size: 0,
    })
    type CTX = typeof ctx

    var pipe0 = new Pipeline<SubCTX>([
      function (err, ctx, done) {
        ctx.cnt = 1
        done()
      },
      function (err, ctx, done) {
        ctx.cnt += 1
        done()
      },
    ])
    var pipe1 = new Pipeline<SubCTX>([
      function (err, ctx, done) {
        ctx.cnt = 1
        done()
      },
      function (err, ctx, done) {
        ctx.cnt += 1
        done()
      },
    ])

    var sw = new MultiWaySwitch<CTX, SubCTX>({
      cases: [pipe0, pipe1],
      split: function (ctx) {
        return ctx.fork()
      },
      combine: function (ctx, retCtx) {
        ctx.size += retCtx.cnt
      },
    })

    sw.execute(ctx, function (err, ctx) {
      expect(ctx?.size).toEqual(4)
      done()
    })
  })

  it('exception errors for', function (done) {
    type CTX = { cnt: number }
    var pipe0 = new Pipeline<CTX>([
      function (err, ctx, done) {
        ctx.cnt = 1
        done()
      },
      function (err, ctx, done) {
        ctx.cnt += 1
        done(new Error())
      },
    ])
    var pipe1 = new Pipeline<CTX>([
      function (err, ctx, done) {
        ctx.cnt = 1
        done()
      },
      function (err, ctx, done) {
        ctx.cnt += 1
        done()
      },
    ])

    var sw = new MultiWaySwitch<CTX, CTX>({
      cases: [pipe0, pipe1],
      split: function (ctx) {
        return ctx.fork()
      },
      combine: function (ctx, retCtx) {
        ctx.size += retCtx.cnt
      },
    })
    sw.execute(
      Context.ensure({
        size: 0,
      }),
      function (err, ctx) {
        expect(ctx?.size).toBe(2)
        expect(err instanceof Error).toBe(true)
        done()
      },
    )
  })

  it('exception errors for 2', function (done) {
    type CTX = { cnt: number }
    var pipe0 = new Pipeline<CTX>([
      function (err, ctx, done) {
        ctx.cnt = 1
        done()
      },
      function (err, ctx, done) {
        ctx.cnt += 1
        done()
      },
    ])
    var pipe1 = new Pipeline<CTX>([
      function (err, ctx, done) {
        ctx.cnt = 1
        done(new Error())
      },
      function (err, ctx, done) {
        ctx.cnt += 1
        done()
      },
    ])

    var sw = new MultiWaySwitch<CTX, CTX>({
      cases: [pipe0, pipe1],
      split: function (ctx) {
        return ctx.fork()
      },
      combine: function (ctx, retCtx) {
        ctx.size += retCtx.cnt
      },
      rescue: function (err, ctx) {
        return err
      },
    })
    sw.execute(
      Context.ensure({
        size: 0,
      }),
      function (err, ctx) {
        expect(ctx?.size).toBe(2)
        expect(err instanceof Error).toBe(true)
        done()
      },
    )
  })

  it('rescue work as expected 1 ', function (done) {
    type CTX = { cnt: number }
    var pipe0 = new Pipeline<CTX>([
      function (ctx) {
        ctx.cnt = 1
      },
      function (ctx) {
        ctx.cnt += 1
      },
    ])

    var pipe1 = new Pipeline<CTX>({
      rescue: function (err, ctx) {
        return
      },
      stages: [
        function (ctx) {
          ctx.cnt = 1
        },
        function (ctx, done) {
          ctx.cnt += 1
          done('error')
        },
      ],
    })

    var sw = new MultiWaySwitch<CTX, CTX>({
      cases: [pipe0, pipe1],
      split: function (ctx) {
        return ctx.fork()
      },
      combine: function (ctx, retCtx) {
        ctx.size += retCtx.cnt
      },
    })
    sw.execute(
      Context.ensure({
        size: 0,
      }),
      function (err, ctx) {
        expect(ctx?.size).toBe(4)
        expect(err).toBeUndefined()
        done()
      },
    )
  })

  it('rescue work as expected 2', function (done) {
    type CTX = { cnt: number }
    var pipe0 = new Pipeline<CTX>([
      function (ctx) {
        ctx.cnt = 1
      },
      function (ctx) {
        ctx.cnt += 1
      },
    ])
    // THIS STAGE WILL BE FAILED
    var pipe1 = new Pipeline<CTX>([
      function (ctx) {
        ctx.cnt = 1
      },
      function (ctx, done) {
        ctx.cnt += 1
        done(new Error('error'))
      },
    ])

    var sw = new MultiWaySwitch<CTX, CTX>({
      cases: [pipe0, pipe1],
      split: function (ctx) {
        return ctx.fork()
      },
      combine: function (ctx, retCtx) {
        ctx.size += retCtx.cnt
      },
      rescue: function (err, ctx) {
        return
      },
    })
    sw.execute(
      Context.ensure({
        size: 0,
      }),
      function (err, ctx) {
        expect(ctx?.size).toBe(2)
        expect(err).toBeUndefined()
        done()
      },
    )
  })

  it('not evaluate if missing evaluate property only if they are strongly evaluate = false', function (done) {
    type CTX = { cnt: number }
    var pipe0 = new Pipeline<CTX>([
      function (err, ctx, done) {
        ctx.cnt = 1
        done()
      },
      function (err, ctx, done) {
        ctx.cnt += 1
        done()
      },
    ])
    var pipe1 = new Pipeline<CTX>({
      rescue: function () {
        return false
      },
      stages: [
        function (err, ctx, done) {
          ctx.cnt = 1
          done()
        },
        function (err, ctx, done) {
          ctx.cnt += 1
          done(new Error('error'))
        },
      ],
    })

    var sw = new MultiWaySwitch<CTX, CTX>({
      cases: [
        pipe0,
        {
          stage: pipe1,
          evaluate: false,
        },
      ],
      split: function (ctx) {
        return ctx.fork()
      },
      combine: function (ctx, retCtx) {
        ctx.size += retCtx.cnt
      },
    })
    sw.execute(
      Context.ensure({
        size: 0,
      }),
      function (err, ctx) {
        expect(ctx?.size).toBe(2)
        expect(err).toBeUndefined()
        done()
      },
    )
  })

  it('evaluate if missing evaluate property', function (done) {
    type CTX = { cnt: number }

    var pipe0 = new Pipeline<CTX>([
      function (err, ctx, done) {
        ctx.cnt = 1
        done()
      },
      function (err, ctx, done) {
        ctx.cnt += 1
        done()
      },
    ])
    var pipe1 = new Pipeline<CTX>({
      rescue: function (err) {
        return false
      },
      stages: [
        function (err, ctx, done) {
          ctx.cnt = 1
          done()
        },
        function (err, ctx, done) {
          ctx.cnt += 1
          done(new Error('error'))
        },
      ],
    })

    var sw = new MultiWaySwitch<CTX, CTX>({
      cases: [
        pipe0,
        {
          stage: pipe1,
        },
      ],
      split: function (ctx) {
        return ctx.fork()
      },
      combine: function (ctx, retCtx) {
        ctx.size += retCtx.cnt
      },
    })
    sw.execute(
      Context.ensure({
        size: 0,
      }),
      function (err, ctx) {
        expect(ctx?.size).toBe(4)
        expect(err).toBeUndefined()
        done()
      },
    )
  })

  it('individual exception handler work', function (done) {
    type SubCTX = { cnt: number }
    type CTX = {
      size: number
    }
    var pipe0 = new Pipeline<SubCTX>([
      function (err, ctx, done) {
        ctx.cnt = 1
        done()
      },
      function (err, ctx, done) {
        ctx.cnt += 1
        done()
      },
    ])
    var pipe1 = new Pipeline<SubCTX>({
      rescue: function (err) {
        return false
      },
      stages: [
        function (err, ctx, done) {
          ctx.cnt = 1
          done()
        },
        function (err, ctx, done) {
          ctx.cnt += 1
          done(new Error())
        },
      ],
    })

    var sw = new MultiWaySwitch<CTX, SubCTX>({
      cases: [
        pipe0,
        {
          stage: pipe1,
          evaluate: true,
        },
      ],
      split: function (ctx) {
        return ctx.fork()
      },
      combine: function (ctx, retCtx) {
        ctx.size += retCtx.cnt
      },
    })

    sw.execute(
      Context.ensure({
        size: 0,
      }),
      function (err, ctx) {
        expect(ctx?.size).toBe(4)
        expect(err).toBeUndefined()
        done()
      },
    )
  })

  it('empty split run combine', function (done) {
    var stage0 = new Stage(function (ctx) {})
    var stage = new MultiWaySwitch<{ combine: boolean }, {}>({
      cases: [stage0],
      split: function (ctx) {
        return []
      },
      combine: function (ctx, children) {
        ctx.combine = true
        return ctx
      },
    })
    stage.execute({}, function (err, context) {
      expect(context?.combine).toBe(true)
      done()
    })
  })

  it('not throw any expections if there is no actions to do', function (done) {
    var sw = new MultiWaySwitch({
      cases: [
        {
          evaluate: false,
          stage: new Stage(function (err, ctx, done) {
            done()
          }),
        },
        {
          evaluate: false,
          stage: new Stage(function (err, ctx, done) {
            done()
          }),
        },
      ],
    })
    sw.execute({}, function (err, ctx) {
      expect(err).toBeUndefined()
      done()
    })
  })

  it('can use function to define stage', function (done) {
    var sw = new MultiWaySwitch({
      cases: [
        {
          evaluate: false,
          stage: new Stage(function (err, ctx, done) {
            done()
          }),
        },
        {
          evaluate: true,
          stage: function (err, ctx, done) {
            done()
          },
        },
      ],
    })
    sw.execute({}, function (err, ctx) {
      expect(err).toBeUndefined()
      done()
    })
  })
})
