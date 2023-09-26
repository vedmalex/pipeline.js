import 'jest'
import { Context } from './Context'
import { Stage } from './stage'

describe('Stage', function () {
  describe('sync', function () {
    it('works', function (done) {
      var v1 = new Stage<{ name?: string }>({
        run: function newName1(ctx: { name?: string }) {
          ctx.name = 'name'
        },
      })
      v1.execute({}, function (err, ctx) {
        expect(ctx?.name == 'name').toBeTruthy()
        done()
      })
    })

    it('catch errors', function (done) {
      var v1 = new Stage<{ name?: string }>({
        run: function newName1(ctx: { name?: string }) {
          ctx.name = 'name'
          throw new Error()
        },
      })
      v1.execute({}, function (err, ctx) {
        expect(err).toBeTruthy()
        done()
      })
    })
  })

  it('throws error if error is not Error instance', function (done) {
    var st = new Stage<{ name?: string }>((_ctx: { name?: string }, done: (err: any) => void) => {
      done('error')
    })

    st.execute({}, function (err, ctx) {
      expect(err instanceof Error).toBeTruthy()
      done()
    })
  })

  describe('rescue', function () {
    it('sync', function (done) {
      var st = new Stage<{ n?: number }>({
        rescue: function (err: any, ctx: { n?: number }) {
          expect('some').toEqual(err.payload[0].message)
        },
        run: function (ctx: { n?: number }) {
          ctx.n = 1
          throw new Error('some')
        },
      } as StageConfig<{ n?: number }>)
      st.execute({}, function (err, ctx) {
        expect(ctx?.n).toEqual(1)
        expect(err).toBeUndefined()
        done()
      })
    })

    it('async', function (done) {
      var st = new Stage<{ n?: number }>({
        rescue: function (err: any) {
          expect('some').toEqual(err.payload[0].message)
        },
        run: function (ctx: { n?: number }) {
          ctx.n = 1
          throw new Error('some')
        },
      } as StageConfig<{ n?: number }>)
      st.execute({}, function (err, ctx) {
        expect(ctx?.n).toEqual(1)
        expect(err).toBeUndefined()
        done()
      })
    })

    // this didn't work at all on node js
    // it('async deep', function (done) {
    //     const config = {
    //       rescue: function (err, ctx) {
    //         expect('some').toEqual(err.message)
    //         return ctx
    //       },
    //       run: function (ctx, done) {
    //         ctx.n = 1
    //         setImmediate(function () {
    //           throw new Error('some')
    //         })
    //       },
    //     }

    //     var st = new Stage(config)
    //     expect(() => {
    //       st.execute({}, function () {
    //         done()
    //       })
    //     }).toThrow()
    // })
  })

  it('do not handle Error it stage signature is (err, ctx, done)', function (done) {
    debugger
    var flag = false
    var st = new Stage({
      validate: function (_: any) {
        return false
      },
      run: function (err, ctx, done) {
        flag = true
        expect(err).toBeTruthy()
        done(err)
      },
    })
    st.execute({}, function (err, context) {
      expect(flag).toBeTruthy()
      expect(err).toBeTruthy()
      done()
    })
  })

  it('accepts name as config', function (done) {
    var name = 'new Name'
    var v = new Stage(name)
    expect(v.name == name).toBeTruthy()
    done()
  })

  it('can init with 2 or 3 parameters', function (done) {
    var v1 = new Stage({
      run: function newName1(ctx, done) {
        done()
      },
    })
    expect(v1.name).toBe('newName1')
    v1.execute({}, function (err, ctx) {
      done()
    })
  })

  it('accepts take function name as stage name', function (done) {
    var v0 = new Stage(function newName(err, ctx, done) {})
    expect(v0.name).toBe('newName')
    var v = new Stage({
      run: function newName(err, ctx, done) {},
    })
    expect(v.name).toBe('newName')
    done()
  })

  it('not allows to use constructor as a function', function (done) {
    try {
      // @ts-expect-error
      var s = Stage()
      done()
    } catch (err) {
      done()
    }
  })

  it('runs within stage', function (done) {
    var s = new Stage(function (this: { someCode: number }, ctx, done) {
      expect(this.someCode).toEqual(100)
      done()
    })
    ;(s as any).someCode = 100
    s.execute({}, function (err, ctx) {
      expect(err).toBeUndefined()
      done()
    })
  })

  /* deprecated context now is any js object
	it('converts context if it is not typeof Context in callback', function(done) {
		var stage = new Stage(function(err, context, done) {
			done();
		});

		stage.execute({}, function(err, ctx) {
			expect(ctx instanceof Context).toEqual( true);
			done();
		});
	});*/

  it('emits done', function (done) {
    var stage = new Stage(function (err, context, done) {
      done()
    })
    stage.execute({}, function (err, context) {
      expect(!context).toEqual(false)
      done()
    })
  })

  // 	это не нужно, поскольку слишком сложная архитектура будет, все передавать через контекст
  // it('extra parameters to emit and to callback', function(done){
  // 	// сделать передачу дополнительных параметров в done, по принципу err, p1,p2,p3...
  // });

  it('emits error with context', function (done) {
    var stage = new Stage(function (err, context, done) {
      done(new Error())
    })

    stage.execute({}, function (err, ctx) {
      expect(!err).toEqual(false)
      expect(!ctx).toEqual(false)
      done()
    })
  })

  it('emits error if it configured to do so', function (done) {
    var stage = new Stage({
      run: function (err, context, done) {
        done(new Error())
      },
    })

    stage.execute({}, function (err, ctx) {
      expect(!err).toEqual(false)
      expect(!ctx).toEqual(false)
      done()
    })
  })

  it('can be traced with {trace:true}', function (done) {
    var stage = new Stage(function Some(err, context, done) {
      done()
    })
    stage.execute({
      trace: true,
    }, function (err, data) {
      done()
    })
  })

  it('can be traced with {trace:true}', function (done) {
    var stage = new Stage(function Some(err, context, done) {
      done()
    })
    stage.execute({
      __trace: true,
    }, function (err, data) {
      done()
    })
  })

  it('emits done if it configured to do so', function (done) {
    var stage = new Stage(function (err, context, done) {
      done()
    })

    stage.execute({}, function (err, context) {
      expect(!context).toEqual(false)
      done()
    })
  })

  // it('prepare and finalize context')

  it('ensureContext', function (done) {
    debugger
    var stage = new Stage<{ done: number }>(function (ctx) {
      ctx.done = 1
    })
    var ensure = 0
    stage.config.ensure = function (ctx, callback) {
      ensure++
      callback(null, ctx)
    }
    stage.execute({ done: -1 }, function (err, ctx) {
      expect(ensure).toEqual(1)
      expect(ctx?.done).toEqual(1)
      done()
    })
  })

  it('must run ensureContext if there is no run function', function (done) {
    debugger
    var stage = new Stage()
    var ensure = 0
    stage.config.ensure = function (ctx, callback) {
      ensure++
      callback(undefined, ctx)
    }
    stage.execute({}, (err, context) => {
      expect(ensure).toEqual(1)
      done()
    })
  })

  it('accept callback', function (done) {
    var stage = new Stage(function (err, context, done) {
      done()
    })
    var ctx = Context.ensure({})
    stage.execute(ctx, function (err, context) {
      expect(ctx).toEqual(context)
      expect(!err).toEqual(true)
      done()
    })
  })

  it('check run is function', function (done) {
    var stage = new Stage()
    var ctx = Context.ensure({})
    stage.execute(ctx, function (err) {
      // expect(ctx.hasErrors().toEqual( true);
      expect(/Error\: STG\: reports\: run is not a function/.test(err.payload[0].toString())).toBeTruthy()
      done()
    })
  })

  it('stage with no run call callback with error', function (done) {
    var stage = new Stage()
    var ctx = Context.ensure({})
    stage.execute(ctx, function (err, context) {
      expect(ctx).toEqual(context)
      expect(/Error\: STG\: reports\: run is not a function/.test(err.payload[0].toString())).toBeTruthy()
      done()
    })
  })

  it('allow reenterability', function (done) {
    var st = new Stage<{ one: number }>(function (err, context, done) {
      context.one++
      done()
    })
    var l = 0

    function gotit() {
      if (++l == 10) {
        done()
      }
    }

    function accept(err, data) {
      expect(data.one).toEqual(2)
      gotit()
    }
    for (var i = 0; i < 10; i++) {
      var ctx1 = Context.ensure({
        one: 1,
      })
      st.execute(ctx1, accept)
    }
  })
})
