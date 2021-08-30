import 'jest'

import { DoWhile } from '../dowhile'
import { Stage } from '../stage'
import {  Context } from '../context'

describe('DoWhile', function () {
  it('works with default', function (done) {
    var stage = new DoWhile()
    expect(stage).toBeInstanceOf(Stage)
    stage.execute({}, function (err, context) {
      expect(err).toBeUndefined()
      // assert.strictEqual(context instanceof Context, true);
      done()
    })
  })

  it('rescue', function (done) {
    var pipe = new DoWhile()
    var st = new Stage({
      run: function (err, ctx, done) {
        throw new Error('error')
      },
      rescue: function (err, conext) {
        if (err.message !== 'error') return err
      },
    })
    pipe.config.stage = st
    pipe.execute({}, function (err, ctx) {
      expect(err).toBeUndefined()
      done()
    })
  })

  it('works with config as Stage', function (done) {
    var stage = new DoWhile(
      new Stage(function (err, ctx, done) {
        done()
      }),
    )
    stage.execute({}, function (err, context) {
      expect(err).toBeUndefined()
      // assert.strictEqual(context instanceof Context, true);
      done()
    })
  })

  it('works with config as Stage', function (done) {
    var stage = new DoWhile({
      stage: function (err, ctx, done) {
        done()
      },
    })
    stage.execute({}, function (err, context) {
      // assert.strictEqual(context instanceof Context, true);
      done()
    })
  })

  it('not allows to use constructor as a function', function (done) {
    try {
      var s = DoWhile()
    } catch (err) {
      done()
    }
  })
  it('run stage', function (done) {
    var stage0 = new Stage(function (err, ctx, done) {
      ctx.iter++
      done()
    })
    var stage = new DoWhile<object>({
      stage: stage0,
      reachEnd: function (err, ctx, iter) {
        return err || iter == 10
      },
    })
    stage.execute(
      {
        iter: -1,
      },
      function (err, context) {
        expect(context.iter).toEqual(9)
        done()
      },
    )
  })

  it('complex example 1', function (done) {
    var stage0 = new Stage({
      run: function (ctx) {
        result++
      },
    })
    var ctx = {
      some: [1, 2, 3, 4, 5, 6, 7],
    }
    var len = ctx.some.length
    var result = 0
    var stage = new DoWhile({
      stage: stage0,
      reachEnd: function (err, ctx, iter) {
        return err || iter == len
      },
    })

    stage.execute(ctx, function (err, context) {
      expect(result).toEqual(7)
      done()
    })
  })

  it('complex example 1 error handling', function (done) {
    var stage0 = new Stage({
      run: function (ctx, done) {
        ctx.liter = 1
        if (ctx.iter === 4) done(new Error())
        else done()
      },
    })
    var ctx = {
      some: [1, 2, 3, 4, 5, 6, 7],
    }
    var len = ctx.some.length
    var stage = new DoWhile({
      stage: stage0,
      split: function (ctx, iter) {
        return {
          iter: ctx.some[iter],
        }
      },
      reachEnd: function (err, ctx, iter) {
        return err || iter == len
      },
    })

    stage.execute(ctx, function (err, context) {
      expect(err).not.toBeUndefined()
      done()
    })
  })

  it('cheks context as well', function (done) {
    var stage0 = new Stage({
      validate: function (ctx) {
        if (ctx.iter > 5) return new Error('error')
        return true
      },
      run: function (ctx, done) {
        ctx.liter = 1
        done()
      },
    })
    var ctx = {
      some: [1, 2, 3, 4, 5, 6, 7],
    }
    var len = ctx.some.length
    var stage = new DoWhile({
      stage: stage0,
      split: function (ctx, iter) {
        return {
          iter: ctx.some[iter],
        }
      },
      reachEnd: function (err, ctx, iter) {
        return err || iter == len
      },
    })
    stage.execute(ctx, function (err, context) {
      expect(err).not.toBeUndefined()
      done()
    })
  })
})
