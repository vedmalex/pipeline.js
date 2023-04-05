import 'jest'
import { Pipeline } from './Pipeline'
import { ComplexError, Context, Stage, isAnyStage } from '../../stage'

describe('Pipeline', function () {
  it('defaults', function (done) {
    var pipe = new Pipeline('defaultName')
    expect(pipe).toBeInstanceOf(Stage)

    expect('defaultName' === pipe.name).toBeTruthy()
    // expect(!pipe.config.stages).toEqual(false)
    expect(pipe.config.stages.length).toEqual(0)
    //@ts-ignore
    expect(!pipe.run).toEqual(true)

    expect(function () {
      pipe.compile()
    }).not.toThrow()
    pipe.execute({}, function (err, data) {
      expect(err == null).toBeTruthy()
      done()
    })
  })

  it('not allows to use constructor as a function', function (done) {
    try {
      // @ts-ignore
      var s = Pipeline()
    } catch (err) {
      done()
    }
  })

  it('addStage', function (done) {
    var pipe = new Pipeline()
    pipe.addStage(new Stage())
    expect(pipe.config.stages.length).toEqual(1)
    expect(isAnyStage(pipe.config.stages[0])).toEqual(true)
    done()
  })

  it('catch throw errors 1', function (done) {
    var pipe = new Pipeline()
    pipe.addStage(function (ctx, done) {
      throw new Error('error')
    })
    pipe.execute({}, function (err, ctx) {
      if (err instanceof ComplexError) expect('error').toEqual((err?.payload as Array<Error>)[0].message)
      done()
    })
  })

  it('catch throw errors 2', function (done) {
    type CTX = { cnt: number }
    var pipe = new Pipeline<CTX>([
      function (err, ctx, done) {
        ctx.cnt = 1
        done(new Error('error'))
      },
      function (err, ctx, done) {
        ctx.cnt += 1
        done()
      },
    ])
    pipe.execute({}, function (err, ctx) {
      if (err instanceof ComplexError) expect('error').toEqual((err?.payload as Array<Error>)[0].message)
      done()
    })
  })

  it('catch throw errors 3', function (done) {
    var pipe = new Pipeline({
      rescue: function (err?) {
        if (err?.message == 'error') return false
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
    pipe.execute({}, function (err, ctx) {
      expect(err).toBeUndefined()
      expect(ctx.cnt).toEqual(2)
      done()
    })
  })

  it('rescue works', function (done) {
    var pipe = new Pipeline()
    var st = new Stage({
      run: function (err, ctx, done) {
        throw new Error('error')
      },
      rescue: function (err, conext) {
        if (err.payload[0].message !== 'error') {
          return err
        }
      },
    })
    pipe.addStage(st)
    pipe.execute({}, function (err, ctx) {
      expect(err == null).toBeTruthy()
      done()
    })
  })

  it('addStage converts function to Stage Instance', function (done) {
    var pipe = new Pipeline()
    pipe.addStage(function (err, ctx, done) {
      done()
    })
    expect(pipe.config.stages[0] instanceof Function).toBeTruthy()
    done()
  })

  it('addStage converts object to Stage Instance', function (done) {
    var pipe = new Pipeline()
    pipe.addStage({
      run: function (err, ctx, done) {
        done()
      },
    })
    expect(isAnyStage(pipe.config.stages[0])).toBeTruthy()
    done()
  })

  it('accept array of stages', function (done) {
    var f1 = function (err, ctx, done) {
      done()
    }
    var f2 = function (err, ctx, done) {
      done()
    }

    var pipe = new Pipeline([f1, f2])
    pipe.addStage(function (err, ctx, done) {
      done()
    })
    expect(pipe.config.stages[0] instanceof Function).toBeTruthy()
    expect(pipe.config.stages[1] instanceof Function).toBeTruthy()

    done()
  })

  it('accept empty addStages', function (done) {
    var pipe = new Pipeline()
    ;(pipe as any).addStage()
    expect(pipe.config.stages.length).toEqual(0)
    done()
  })

  it('compile', function (done) {
    var pipe = new Pipeline()
    pipe.addStage(new Stage())
    pipe.compile()
    // @ts-expect-error
    expect(typeof pipe.run == 'function').toBeTruthy()
    pipe.addStage(new Stage())
    expect(!(pipe as any).run).toBeTruthy()
    done()
  })

  it('execute must call compile and ensure', function (done) {
    let ensure = 0
    let compile = 0

    let pipe = new Pipeline({
      precompile: () => {
        compile++
      },
      ensure: function (ctx, callback) {
        ensure++
        callback()
      },
    } as any)
    pipe.addStage(
      new Stage(function (err, context, done) {
        done()
      }),
    )

    pipe.execute({}, (err, ctx) => {
      expect(ensure).toEqual(1)
      expect(compile).toEqual(1)
      done()
    })
  })

  it('executes pipes in pipes', function (done) {
    type CTX = { item: number }
    var pipe = new Pipeline<CTX>()
    var nestedpipe = new Pipeline()
    nestedpipe.addStage(function (err, ctx, done) {
      ctx.item = 1
      done()
    })
    pipe.addStage(nestedpipe)
    pipe.execute(
      {
        item: 0,
      },
      function (err, ctx) {
        expect(err).toBeUndefined()
        expect(1).toEqual(ctx?.item)
        done()
      },
    )
  })

  it('context catch all errors', function (done) {
    type CTX = { s1: boolean; s2: boolean; s3: boolean }
    var pipe = new Pipeline<CTX>()
    var ctx1 = Context.create<CTX>({
      s1: false,
      s2: false,
      s3: false,
    })
    var error = new Error('THE ERROR')

    var s1 = new Stage(function (context, done) {
      expect(context).toEqual(ctx1)
      context.s1 = true
      done()
    })
    var s2 = new Stage(function (context, done) {
      expect(context).toEqual(ctx1)
      context.s2 = true
      done(error)
    })
    var s3 = new Stage(function (context, done) {
      context.s3 = true
      done(new Error('another ERROR'))
    })

    pipe.addStage(s1)
    pipe.addStage(s2)
    pipe.addStage(s3)

    pipe.execute(ctx1, function (err, ctx) {
      expect(err?.payload[0]).toEqual(error)
      // expect(ctx1.hasErrors()).toEqual(true);
      // expect(ctx1.getErrors()[0] == error).toEqual(true);
      expect(ctx1.get('s1')).toEqual(true)
      expect(ctx1.get('s2')).toEqual(true)
      expect(ctx1.get('s3')).toEqual(false)
      done()
    })
  })

  it('ensure Context Error use', function (done) {
    type CTX = { SomeValue: number }
    var ctx: CTX = { SomeValue: 1 }
    var pipe = new Pipeline<CTX>()
    var error = new Error('context not ready')
    pipe.addStage(
      new Stage<CTX>({
        run: function (err, context, done) {
          context.SomeValue += 1
          done()
        },
        ensure: function (context, callback) {
          if (context.SomeValue !== 1) callback(error)
          else callback(null, context)
        },
      }),
    )
    var stage2 = {
      ensure: function WV(context, callback) {
        if (context.SomeValue !== 1) {
          callback(new Error(/* this.reportName +  */ ': Wrong Value'))
        } else callback(null, context)
      },
      run: undefined, // so it will be 0
    }
    var s2 = new Stage(stage2)
    pipe.addStage(s2)
    pipe.execute(ctx, function (err) {
      expect(err).not.toBeUndefined()
      expect(/Error: STG: reports: run is not a function/.test(err.payload[0].toString())).toBeTruthy()
      done()
    })
  })

  it('can do subclassing of Pipeline', function (done) {
    class newPipe extends Pipeline<{}> {
      constructor() {
        super()
        this.addStage(new Stage())
        this.addStage(new Stage())
        this.addStage(new Stage())
      }
    }

    var p1 = new newPipe()
    expect(p1.config.stages.length).toEqual(3)
    var p2 = new newPipe()
    p2.addStage(new Stage())
    expect(p2.config.stages.length).toEqual(4)
    var p3 = new newPipe()
    expect(p3.config.stages.length).toEqual(3)
    done()
  })

  it('allow reenterability', function (done) {
    type CTX = { one: number }
    var pipe = new Pipeline<CTX>()

    pipe.addStage(function (context: CTX, done) {
      process.nextTick(function () {
        context.one++
        done()
      })
    })

    pipe.addStage(function (context: CTX, done) {
      process.nextTick(function () {
        context.one += 1
        done()
      })
    })

    pipe.addStage(function (context: CTX, done) {
      context.one += 5
      done()
    })

    var l = 0

    function gotit() {
      if (++l == 10) done()
    }
    for (var i = 0; i < 10; i++) {
      ;(function () {
        var ctx1: CTX = {
          one: 1,
        }
        pipe.execute(ctx1, function (err, data) {
          expect(data?.one).toEqual(8)
          gotit()
        })
      })()
    }
  })
})
