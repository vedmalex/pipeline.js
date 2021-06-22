import { not } from 'ajv/dist/compile/codegen'
import 'jest'
import { Stage } from '../stage'

describe('Stage', function () {
  describe('sync', function () {
    it('works', function (done) {
      var v1 = new Stage({
        run: function newName1(ctx) {
          ctx.name = 'name'
        },
      })
      v1.execute({}, function (err, ctx) {
        expect(ctx.name == 'name').toBeTruthy()
        done()
      })
    })

    it('catch errors', function (done) {
      var v1 = new Stage({
        run: function newName1(ctx) {
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
    var st = new Stage(function (ctx, done) {
      done('error')
    })

    st.execute({}, function (err, ctx) {
      expect(err instanceof Error).toBeTruthy()
      done()
    })
  })

  describe('rescue', function () {
    it('sync', function (done) {
      var st = new Stage({
        rescue: function (err, ctx) {
          expect('some').toEqual(err.message)
        },
        run: function (ctx) {
          ctx.n = 1
          throw new Error('some')
        },
      })
      st.execute({}, function (err, ctx) {
        expect(ctx.n).toEqual(1)
        expect(err).not.toBeUndefined()
        done()
      })
    })

    it('async', function (done) {
      var st = new Stage({
        rescue: function (err, ctx) {
          expect('some').toEqual(err.message)
        },
        run: function (ctx, done) {
          ctx.n = 1
          throw new Error('some')
        },
      })
      st.execute({}, function (err, ctx) {
        expect(ctx.n).toEqual(1)
        expect(err).not.toBeUndefined()
        done()
      })
    })

    it('async deep', function (done) {
      var st = new Stage({
        rescue: function (err, ctx) {
          expect('some').toEqual(err.message)
        },
        run: function (ctx, done) {
          ctx.n = 1
          setImmediate(function () {
            throw new Error('some')
          })
        },
      })

      st.execute({}, function () {
        done()
      })
    })
  })

  it('do not handle Error it stage signature is (err, ctx, done)', function (done) {
    debugger
    var flag = false
    var st = new Stage({
      validate: function (ctx) {
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
    expect(v1.name == 'newName1').toBeTruthy()
    v1.execute({}, function (err, ctx) {
      done()
    })
  })

  it('accepts take function name as stage name', function (done) {
    var v0 = new Stage(function newName(err, ctx, done) {})
    expect(v0.name == 'newName').toBeTruthy()
    var v = new Stage({
      run: function newName(err, ctx, done) {},
    })
    expect(v.name == 'newName').toBeTruthy()
    done()
  })

  it('not allows to use constructor as a function', function (done) {
    try {
      var s = Stage()
    } catch (err) {
      done()
    }
  })

  it('runs within stage', function (done) {
    var s = new Stage(function (ctx, done) {
      expect(this.someCode).toEqual(100)
      done()
    })
    s.someCode = 100
    s.execute({}, function (err, ctx) {
      expect(err).not.toBeUndefined()
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
    stage.execute({}, function () {
      expect(!context).toEqual(false)
      done()
    })
  })

  //	это не нужно, поскольку слишком сложная архитектура будет, все передавать через контекст
  // it('extra parameters to emit and to callback', function(done){
  // 	// сделать передачу дополнительных параметров в done, по принципу err, p1,p2,p3...
  // });

  it('emits error with context', function (done) {
    var stage = new Stage(function (err, context, done) {
      done(new Error())
    })

    stage.execute({}, function (err, ctx) {
      expect(!err).toEqual(false)
      expect(!context).toEqual(false)
      done()
    })
  })

  it('emits error if it configured to do so', function (done) {
    var stage = new Stage({
      run: function (err, context, done) {
        done(new Error())
      },
    })

    stage.execute({}, function (err, data) {
      expect(!err).toEqual(false)
      expect(!context).toEqual(false)
      done()
    })
  })

  it('can be traced with {trace:true}', function (done) {
    var stage = new Stage(function Some(err, context, done) {
      done()
    })
    stage.execute(
      {
        trace: true,
      },
      function (err, data) {
        done()
      },
    )
  })

  it('can be traced with {trace:true}', function (done) {
    var stage = new Stage(function Some(err, context, done) {
      done()
    })
    stage.execute(
      {
        __trace: true,
      },
      function (err, data) {
        done()
      },
    )
  })

  it('emits done if it configured to do so', function (done) {
    var stage = new Stage(function (err, context, done) {
      done()
    })

    stage.execute({}, function (err, data) {
      expect(!context).toEqual(false)
      done()
    })
  })

  it('prepare and finalize context')

  it('ensureContext', function (done) {
    debugger
    var stage = new Stage(function (ctx) {
      ctx.done = 1
    })
    var ensure = 0
    stage.ensure = function (ctx, callback) {
      ensure++
      callback(null, context)
    }
    stage.execute({}, function (err, ctx) {
      expect(ensure, 1).toEqual('ensure must called by default')
      expect(ctx.done, 1).toEqual('ensure must called by default')
      done()
    })
  })

  it('not run ensureContext if there is no run function', function (done) {
    var stage = new Stage()
    var ensure = 0
    stage.ensure = function (ctx, callback) {
      ensure++
      callback(null, context)
    }
    stage.execute({})
    expect(ensure).toEqual(0)
    done()
  })

  it('accept callback', function (done) {
    var stage = new Stage(function (err, context, done) {
      done()
    })
    var ensure = 0
    var ctx = new Context({})
    stage.execute(ctx, function (err, context) {
      expect(ctx).toEqual(context)
      expect(!err).toEqual(true)
      done()
    })
  })

  it('check run is function', function (done) {
    var stage = new Stage()
    var ensure = 0
    var ctx = new Context({})
    stage.execute(ctx, function (err) {
      // expect(ctx.hasErrors().toEqual( true);
      assert.strictEqual(
        /Error\: STG\: reports\: run is not a function/.test(err.toString()),
        true,
      )
      done()
    })
  })

  it('stage with no run call callback with error', function (done) {
    var stage = new Stage()
    var ctx = new Context()
    stage.execute(ctx, function (err, context) {
      expect(ctx).toEqual(context)
      assert.strictEqual(
        /Error\: STG\: reports\: run is not a function/.test(err.toString()),
        true,
      )
      done()
    })
  })

  it('allow reenterability', function (done) {
    var st = new Stage(function (err, context, done) {
      context.one++
      done()
    })
    var l = 0

    function gotit() {
      if (++l == 10) done()
    }

    function accept(err, data) {
      expect(data.one).toEqual(2)
      gotit()
    }
    for (var i = 0; i < 10; i++) {
      var ctx1 = new Context({
        one: 1,
      })
      st.execute(ctx1, accept)
    }
  })

  // it('addStage converts valid object structure to Stage', function(done){
  // });
})
