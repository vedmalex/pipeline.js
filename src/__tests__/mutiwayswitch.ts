import 'jest'
import { Context } from '../context'
import { MultiWaySwitch } from '../multiwayswitch'
import { Pipeline } from '../pipeline'
import { Stage } from '../stage'

describe('MWS', function() {
  it('works', function(done) {
    var sw = new MultiWaySwitch()
    expect(sw).toBeInstanceOf(Stage)
    sw.execute({}, function(err, ctx) {
      done()
    })
  })

  it('not allows to use constructor as a function', function(done) {
    try {
      var s = MultiWaySwitch()
    } catch (err) {
      done()
    }
  })

  it('must enter in each pipe works in parallel', function(done) {
    var cnt = 0
    var pipe0 = new Pipeline([
      function(err, ctx, done) {
        ctx.p00 = true
        cnt++
        done()
      },
      function(err, ctx, done) {
        ctx.p01 = true
        cnt++
        done()
      },
    ])
    var pipe1 = new Pipeline([
      function(err, ctx, done) {
        ctx.p10 = true
        cnt++
        done()
      },
      function(err, ctx, done) {
        ctx.p11 = true
        cnt++
        done()
      },
    ])
    var pipe2 = new Pipeline({
      stages: [
        function(err, ctx, done) {
          ctx.p20 = true
          cnt++
          done()
        },
        function(err, ctx, done) {
          ctx.p21 = true
          cnt++
          done()
        },
      ],
    })

    var sw = new MultiWaySwitch([pipe0, pipe1, pipe2])
    sw.execute({}, function(err, ctx) {
      expect(cnt).toEqual(6)
      done()
    })
  })

  it('use trace', function(done) {
    var sw = new MultiWaySwitch({
      cases: [
        {
          stage: function(err, ctx, done) {
            done()
          },
          evaluate: function() {
            return true
          },
          split: function(ctx) {
            return ctx.fork()
          },
        },
        {
          stage: {
            run: function(err, ctx, done) {
              done()
            },
          },
          evaluate: function() {
            return true
          },
          split: function(ctx) {
            return ctx.fork()
          },
        },
      ],
    })

    sw.execute(
      Context.ensure({
        trace: true,
      }),
      function(err, ctx) {
        done()
      },
    )
  })

  it('use defaults condition as object', function(done) {
    var sw = new MultiWaySwitch({
      cases: [
        {
          stage: function(err, ctx, done) {
            done()
          },
          evaluate: function() {
            return true
          },
        },
        {
          stage: {
            run: function(err, ctx, done) {
              done()
            },
          },
          evaluate: function() {
            return true
          },
        },
      ],
    })

    sw.execute({}, function(err, ctx) {
      done()
    })
  })

  it('must enter in each pipe works in parallel', function(done) {
    var pipe0 = new Pipeline([
      function(err, ctx, done) {
        ctx.cnt = 1
        done()
      },
      function(err, ctx, done) {
        ctx.cnt += 1
        done()
      },
    ])
    var pipe1 = new Pipeline([
      function(err, ctx, done) {
        ctx.cnt = 1
        done()
      },
      function(err, ctx, done) {
        ctx.cnt += 1
        done()
      },
    ])

    var sw = new MultiWaySwitch({
      cases: [pipe0, pipe1],
      split: function(ctx) {
        return ctx.fork()
      },
      combine: function(ctx, retCtx) {
        ctx.size += retCtx.cnt
      },
    })
    sw.execute(
      Context.ensure({
        size: 0,
      }),
      function(err, ctx) {
        expect(ctx.size).toEqual(4)
        done()
      },
    )
  })

  it('exception errors for', function(done) {
    var pipe0 = new Pipeline([
      function(err, ctx, done) {
        ctx.cnt = 1
        done()
      },
      function(err, ctx, done) {
        ctx.cnt += 1
        done(new Error())
      },
    ])
    var pipe1 = new Pipeline([
      function(err, ctx, done) {
        ctx.cnt = 1
        done()
      },
      function(err, ctx, done) {
        ctx.cnt += 1
        done()
      },
    ])

    var sw = new MultiWaySwitch({
      cases: [pipe0, pipe1],
      split: function(ctx) {
        return ctx.fork()
      },
      combine: function(ctx, retCtx) {
        ctx.size += retCtx.cnt
      },
    })
    sw.execute(
      Context.ensure({
        size: 0,
      }),
      function(err, ctx) {
        expect(ctx.size).toBe(2)
        debugger
        expect(err instanceof Error).toBe(true)
        done()
      },
    )
  })

  it('exception errors for 2', function(done) {
    var pipe0 = new Pipeline([
      function(err, ctx, done) {
        ctx.cnt = 1
        done()
      },
      function(err, ctx, done) {
        ctx.cnt += 1
        done()
      },
    ])
    var pipe1 = new Pipeline([
      function(err, ctx, done) {
        ctx.cnt = 1
        done(new Error())
      },
      function(err, ctx, done) {
        ctx.cnt += 1
        done()
      },
    ])

    var sw = new MultiWaySwitch({
      cases: [pipe0, pipe1],
      split: function(ctx) {
        return ctx.fork()
      },
      combine: function(ctx, retCtx) {
        ctx.size += retCtx.cnt
      },
      rescue: function(err, ctx) {
        return err
      },
    })
    sw.execute(
      Context.ensure({
        size: 0,
      }),
      function(err, ctx) {
        expect(ctx.size).toBe(2)
        expect(err instanceof Error).toBe(true)
        done()
      },
    )
  })

  it('rescue work as expected 1 ', function(done) {
    var pipe0 = new Pipeline([
      function(ctx) {
        ctx.cnt = 1
      },
      function(ctx) {
        ctx.cnt += 1
      },
    ])

    var pipe1 = new Pipeline({
      rescue: function(err, ctx) {
        return
      },
      stages: [
        function(ctx) {
          ctx.cnt = 1
        },
        function(ctx, done) {
          ctx.cnt += 1
          done('error')
        },
      ],
    })

    var sw = new MultiWaySwitch({
      cases: [pipe0, pipe1],
      split: function(ctx) {
        return ctx.fork()
      },
      combine: function(ctx, retCtx) {
        ctx.size += retCtx.cnt
      },
    })
    sw.execute(
      Context.ensure({
        size: 0,
      }),
      function(err, ctx) {
        expect(ctx.size).toBe(4)
        expect(err).toBeUndefined()
        done()
      },
    )
  })

  it('rescue work as expected 2', function(done) {
    var pipe0 = new Pipeline([
      function(ctx) {
        ctx.cnt = 1
      },
      function(ctx) {
        ctx.cnt += 1
      },
    ])
    // THIS STAGE WILL BE FAILED
    var pipe1 = new Pipeline([
      function(ctx) {
        ctx.cnt = 1
      },
      function(ctx, done) {
        ctx.cnt += 1
        done(new Error('error'))
      },
    ])

    var sw = new MultiWaySwitch({
      cases: [pipe0, pipe1],
      split: function(ctx) {
        return ctx.fork()
      },
      combine: function(ctx, retCtx) {
        ctx.size += retCtx.cnt
      },
      rescue: function(err, ctx) {
        return
      },
    })
    sw.execute(
      Context.ensure({
        size: 0,
      }),
      function(err, ctx) {
        expect(ctx.size).toBe(2)
        expect(err).toBeUndefined()
        done()
      },
    )
  })

  it(
    'not evaluate if missing evaluate property only if they are strongly evaluate = false',
    function(done) {
      var pipe0 = new Pipeline([
        function(err, ctx, done) {
          ctx.cnt = 1
          done()
        },
        function(err, ctx, done) {
          ctx.cnt += 1
          done()
        },
      ])
      var pipe1 = new Pipeline({
        rescue: function() {
          return false
        },
        stages: [
          function(err, ctx, done) {
            ctx.cnt = 1
            done()
          },
          function(err, ctx, done) {
            ctx.cnt += 1
            done(new Error('error'))
          },
        ],
      })

      var sw = new MultiWaySwitch({
        cases: [
          pipe0,
          {
            stage: pipe1,
            evaluate: false,
          },
        ],
        split: function(ctx) {
          return ctx.fork()
        },
        combine: function(ctx, retCtx) {
          ctx.size += retCtx.cnt
        },
      })
      sw.execute(
        Context.ensure({
          size: 0,
        }),
        function(err, ctx) {
          expect(ctx.size).toBe(2)
          expect(err).toBeUndefined()
          done()
        },
      )
    },
  )

  it('evaluate if missing evaluate property', function(done) {
    var pipe0 = new Pipeline([
      function(err, ctx, done) {
        ctx.cnt = 1
        done()
      },
      function(err, ctx, done) {
        ctx.cnt += 1
        done()
      },
    ])
    var pipe1 = new Pipeline({
      rescue: function(err) {
        return false
      },
      stages: [
        function(err, ctx, done) {
          ctx.cnt = 1
          done()
        },
        function(err, ctx, done) {
          ctx.cnt += 1
          done(new Error('error'))
        },
      ],
    })

    var sw = new MultiWaySwitch({
      cases: [
        pipe0,
        {
          stage: pipe1,
        },
      ],
      split: function(ctx) {
        return ctx.fork()
      },
      combine: function(ctx, retCtx) {
        ctx.size += retCtx.cnt
      },
    })
    sw.execute(
      Context.ensure({
        size: 0,
      }),
      function(err, ctx) {
        expect(ctx.size).toBe(4)
        expect(err).toBeUndefined()
        done()
      },
    )
  })

  it('individual exception handler work', function(done) {
    var pipe0 = new Pipeline([
      function(err, ctx, done) {
        ctx.cnt = 1
        done()
      },
      function(err, ctx, done) {
        ctx.cnt += 1
        done()
      },
    ])
    var pipe1 = new Pipeline({
      rescue: function(err) {
        return false
      },
      stages: [
        function(err, ctx, done) {
          ctx.cnt = 1
          done()
        },
        function(err, ctx, done) {
          ctx.cnt += 1
          done(new Error())
        },
      ],
    })

    var sw = new MultiWaySwitch({
      cases: [
        pipe0,
        {
          stage: pipe1,
          evaluate: true,
        },
      ],
      split: function(ctx) {
        return ctx.fork()
      },
      combine: function(ctx, retCtx) {
        ctx.size += retCtx.cnt
      },
    })
    sw.execute(
      Context.ensure({
        size: 0,
      }),
      function(err, ctx) {
        expect(ctx.size).toBe(4)
        expect(err).toBeUndefined()
        done()
      },
    )
  })

  it('empty split run combine', function(done) {
    var stage0 = new Stage(function(ctx) {})
    var stage = new MultiWaySwitch({
      cases: [stage0],
      split: function(ctx) {
        return []
      },
      combine: function(ctx, children) {
        ctx.combine = true
        return ctx
      },
    })
    stage.execute({}, function(err, context) {
      expect(context.combine).toBe(true)
      done()
    })
  })

  it('not throw any expections if there is no actions to do', function(done) {
    var sw = new MultiWaySwitch({
      cases: [
        {
          evaluate: false,
          stage: new Stage(function(err, ctx, done) {
            done()
          }),
        },
        {
          evaluate: false,
          stage: new Stage(function(err, ctx, done) {
            done()
          }),
        },
      ],
    })
    sw.execute({}, function(err, ctx) {
      expect(err).toBeUndefined()
      done()
    })
  })

  it('can use function to define stage', function(done) {
    var sw = new MultiWaySwitch({
      cases: [
        {
          evaluate: false,
          stage: new Stage(function(err, ctx, done) {
            done()
          }),
        },
        {
          evaluate: true,
          stage: function(err, ctx, done) {
            done()
          },
        },
      ],
    })
    sw.execute({}, function(err, ctx) {
      expect(err).toBeUndefined()
      done()
    })
  })
})
