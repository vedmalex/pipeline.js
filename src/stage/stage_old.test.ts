import 'jest'
import { Stage } from './stage'

describe('Stage_old', function () {
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
      })
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
      })
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

  it('emits done', function (done) {
    var stage = new Stage({
      run: function (err, context, done) {
        done()
      },
    })
    stage.execute({}, function (err, context) {
      expect(!context).toEqual(false)
      done()
    })
  })

  it('emits error with context', function (done) {
    var stage = new Stage({
      run: function (err, context, done) {
        done(new Error() as any)
      },
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
    var stage = new Stage({
      run: function Some(err, context, done) {
        done()
      },
    })
    stage.execute({
      trace: true,
    }, function (err, data) {
      done()
    })
  })

  it('can be traced with {trace:true}', function (done) {
    var stage = new Stage({
      run: function Some(err, context, done) {
        done()
      },
    })
    stage.execute({
      __trace: true,
    }, function (err, data) {
      done()
    })
  })

  it('check run is function', function (done) {
    var stage = new Stage({})
    stage.execute({}, function (err) {
      // expect(ctx.hasErrors().toEqual( true);
      expect(err).not.toBeUndefined()
      done()
    })
  })

  it('allow reenterability', function () {
    var st = new Stage({
      run: function (context) {
        context.one++
      },
    })
    function accept(err, data) {
      expect(data.one).toEqual(2)
    }
    for (var i = 0; i < 10; i++) {
      st.execute({ one: 1 }, accept)
    }
  })
})
