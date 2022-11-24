import 'jest'
import { IfElse } from '../ifelse'
import { Stage } from '../stage'

describe('if->else', function () {
  it('simple works', function (done) {
    var stage = new IfElse()
    expect(stage).toBeInstanceOf(Stage)
    stage.execute({}, function (err, context) {
      // assert.strictEqual(context instanceof Context, true);
      done()
    })
  })
  it('not allows to use constructor as a function', function (done) {
    try {
      var s = eval('IfElse()')
    } catch (err) {
      done()
    }
  })

  it('simple works sucess', function (done) {
    var s0 = new Stage(function (err, ctx, done) {
      if (ctx) ctx.done = true
      else throw new Error('nonsense')
      done()
    })
    var stage = new IfElse({
      condition: function (ctx) {
        return true
      },
      success: s0,
      failed: new Stage(),
    })
    stage.execute({}, function (err, context) {
      expect(context.done).toBeTruthy()
      done()
    })
  })

  it('simple works sucess as function', function (done) {
    var s0 = function (err, ctx, done) {
      ctx.done = true
      done()
    }
    var stage = new IfElse({
      condition: function (ctx) {
        return true
      },
      success: s0,
      failed: new Stage(),
    })
    stage.execute({}, function (err, context) {
      expect(context.done).toBeTruthy()
      done()
    })
  })

  it('simple works failed', function (done) {
    var s0 = new Stage(function (err, ctx, done) {
      if (ctx) ctx.done = true
      else throw new Error('nonsense')
      done()
    })

    var stage = new IfElse({
      condition: function (ctx) {
        return false
      },
      failed: s0,
      success: new Stage(),
    })

    stage.execute({}, function (err, context) {
      expect(context.done).toBeTruthy()
      done()
    })
  })

  it('simple works failed', function (done) {
    var s0 = function (err, ctx, done) {
      ctx.done = true
      done()
    }

    var stage = new IfElse({
      condition: function (ctx) {
        return false
      },
      failed: s0,
      success: new Stage(),
    })

    stage.execute({}, function (err, context) {
      expect(context.done).toBeTruthy()
      done()
    })
  })
})
