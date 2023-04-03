var assert = require('assert')

var Stage = require('pipeline.js').Stage
var Context = require('pipeline.js').Context
var Pipeline = require('pipeline.js').Pipeline
var Sequential = require('pipeline.js').Sequential
var Parallel = require('pipeline.js').Parallel
var IfElse = require('pipeline.js').IfElse
var Timeout = require('pipeline.js').Timeout
var Wrap = require('pipeline.js').Wrap
var RetryOnError = require('pipeline.js').RetryOnError
var MultiWaySwitch = require('pipeline.js').MultiWaySwitch
var DoWhile = require('pipeline.js').DoWhile
var Empty = require('pipeline.js').Empty
var sb = require('./index.js')

describe('Stage', function () {
  it('Stage inits Base', function (done) {
    var st = sb
      .Stage(function (err, ctx, done) {
        done()
      })
      .ensure(function (ctx) {
        return true
      })
      .name('typeicalStage')
      .validate(function (ctx) {
        return true
      })
      .schema({
        name: Number,
      })
      .rescue(function () {
        return
      })

    assert(st.cfg.name === 'typeicalStage')
    assert(st.cfg.schema)
    assert(st.cfg.ensure)
    assert(st.cfg.rescue)
    assert(st.cfg.validate)
    assert.throws(function () {
      var stg = st.build()
    })
    // assert(stg instanceof Stage);
    done()
  })
  it('Stage is built', function (done) {
    var st = sb
      .Stage(function (err, ctx, done) {
        done()
      })
      .ensure(function (ctx) {
        return true
      })
      .name('typeicalStage')
      .schema({
        name: Number,
      })
    var stg = st.build()
    assert(stg instanceof Stage)
    done()
  })
  it('not Throws on empty stages', function (done) {
    assert.doesNotThrow(function () {
      var pipe = sb.Stage().stage(function () {})
    })

    done()
  })
  it('throws on empty stages', function (done) {
    assert.throws(function () {
      var pipe = sb.Stage().stage(1)
    })

    done()
  })
})

describe('Pipeline', function () {
  it('Works inits', function (done) {
    var pipe = sb
      .Pipeline(function () {})
      .then(function () {})
      .then(new sb.fStage(function () {}))
      .then({
        run: function () {},
        schema: {},
      })
      .then(new Stage(function () {}))
    assert(pipe.cfg.stages)
    assert(pipe.cfg.stages.length === 5)
    done()
  })

  it('Built', function (done) {
    var pipe = sb
      .Pipeline(function () {})
      .then(function () {})
      .then(new sb.fStage(function () {}))
      .then({
        run: function () {},
        schema: {},
      })
      .then(new Stage(function () {}))

    assert(pipe.cfg.stages.length === 5)
    debugger
    var p = pipe.build()
    assert(p instanceof Pipeline)
    assert(
      p.stages.every(function (st) {
        return st instanceof Stage
      }),
    )
    done()
  })

  it('not Throws on empty stages', function (done) {
    assert.doesNotThrow(function () {
      var pipe = sb
        .Pipeline()
        .then(function () {})
        .then()
        .then({
          run: function () {},
          schema: {},
        })
        .then(new Stage(function () {}))
      assert(pipe.cfg.stages.length === 3)
    })

    done()
  })
  it('Throws on wrong stages', function (done) {
    assert.throws(function () {
      var pipe = sb
        .Pipeline(false)
        .then(function () {})
        .then(1)
        .then({
          run: function () {},
          schema: {},
        })
        .then(new Stage(function () {}))
    })

    done()
  })
})

describe('Parallel', function (done) {
  it('inits', function (done) {
    var par = sb
      .Parallel(function () {})
      .split(function () {})
      .combine(function () {})
    assert(par.cfg.combine)
    assert(par.cfg.split)
    assert(par.cfg.stage)
    done()
  })
  it('Built', function (done) {
    var par = sb
      .Parallel(function () {})
      .split(function () {})
      .combine()
    var p = par.build()
    assert(p instanceof Parallel)
    done()
  })
  it('not throws on empty stage', function (done) {
    assert.doesNotThrow(function () {
      var par = sb
        .Parallel()
        .stage(function () {})
        .split(function () {})
        .combine()
      par.build()
    })
    done()
  })
  it('throws on wrong stage', function (done) {
    assert.throws(function () {
      var par = sb
        .Parallel()
        .stage(true)
        .split(function () {})
        .combine()
      par.build()
    })
    done()
  })
})

describe('Sequential', function (done) {
  it('inits', function (done) {
    var par = sb
      .Sequential(function () {})
      .split(function () {})
      .combine(function () {})
    assert(par.cfg.combine)
    assert(par.cfg.split)
    assert(par.cfg.stage)
    done()
  })
  it('Built', function (done) {
    var par = sb
      .Sequential(function () {})
      .split(function () {})
      .combine()
    var p = par.build()
    assert(p instanceof Sequential)
    done()
  })
  it('not throws on empty stage', function (done) {
    assert.doesNotThrow(function () {
      var par = sb
        .Sequential()
        .stage(function () {})
        .split(function () {})
        .combine()
      par.build()
    })
    done()
  })
  it('throws on wrong stage', function (done) {
    assert.throws(function () {
      var par = sb
        .Sequential()
        .stage(true)
        .split(function () {})
        .combine()
      par.build()
    })
    done()
  })
})

describe('RetryOnError', function (done) {
  it('inits', function (done) {
    var par = sb
      .RetryOnError(function () {})
      .retry(function () {})
      .backup(function () {})
      .restore(function () {})
    assert(par.cfg.stage)
    assert(par.cfg.retry)
    done()
  })
  it('Built', function (done) {
    debugger
    var empty = function () {}
    var par = sb
      .RetryOnError(function () {})
      .retry(function () {})
      .backup(empty)
      .restore(empty)
    var p = par.build()

    assert(p instanceof RetryOnError)
    assert(p.restoreContext == empty)
    assert(p.backupContext == empty)
    done()
  })
  it('not throws on empty stage', function (done) {
    assert.doesNotThrow(function () {
      var par = sb
        .RetryOnError()
        .stage(function () {})
        .retry(function () {})
      var p = par.build()
    })
    done()
  })
  it('throws on wrong stage', function (done) {
    assert.throws(function () {
      var par = sb
        .RetryOnError(function () {})
        .stage(1)
        .retry(function () {})
      var p = par.build()
    })
    done()
  })
})

describe('Timeout', function (done) {
  it('inits', function (done) {
    var par = sb
      .Timeout(function () {})
      .overdue(function () {})
      .timeout(function () {})
    assert(par.cfg.stage)
    assert(par.cfg.timeout)
    assert(par.cfg.overdue)
    done()
  })
  it('Built', function (done) {
    var par = sb
      .Timeout(function () {})
      .overdue(function () {})
      .timeout(10)
    var p = par.build()
    assert(p instanceof Timeout)

    par = sb
      .Timeout(function () {})
      .overdue(function () {})
      .timeout(function () {})
    p = par.build()

    done()
  })
  it('not throws on empty stage', function (done) {
    assert.doesNotThrow(function () {
      var par = sb
        .Timeout()
        .stage(function () {})
        .overdue(function () {})
        .timeout(10)
      par.build()
    })
    done()
  })
  it('throws on wrong stage', function (done) {
    assert.throws(function () {
      var par = sb
        .Timeout(function () {})
        .stage(1)
        .overdue(function () {})
        .timeout(10)
      par.build()
    })
    done()
  })
})

describe('Wrap', function (done) {
  it('inits', function (done) {
    var par = sb
      .Wrap(function () {})
      .prepare(function () {})
      .finalize(function () {})
    assert(par.cfg.stage)
    assert(par.cfg.prepare)
    assert(par.cfg.finalize)
    done()
  })
  it('Built', function (done) {
    var par = sb
      .Wrap(function () {})
      .prepare(function () {})
      .finalize(function () {})
    var p = par.build()
    assert(p instanceof Wrap)
    done()
  })
  it('not throws on empty stage', function (done) {
    assert.doesNotThrow(function () {
      var par = sb
        .Wrap()
        .stage(function () {})
        .prepare(function () {})
        .finalize(function () {})
      par.build()
    })
    done()
  })
  it('throws on wrong stage', function (done) {
    assert.throws(function () {
      var par = sb
        .Wrap()
        .stage(1)
        .prepare(function () {})
        .finalize(function () {})
      par.build()
    })
    done()
  })
})

describe('DoWhile', function (done) {
  it('inits', function (done) {
    var par = sb
      .DoWhile(function () {})
      .split(function () {})
      .reachEnd(function () {})
    assert(par.cfg.stage)
    assert(par.cfg.split)
    assert(par.cfg.reachEnd)
    done()
  })
  it('Built', function (done) {
    var par = sb
      .DoWhile(function () {})
      .split(function () {})
      .reachEnd(function () {})
    var p = par.build()
    assert(p instanceof DoWhile)
    done()
  })
  it('not throws on empty stage', function (done) {
    assert.doesNotThrow(function () {
      var par = sb
        .DoWhile()
        .stage(function () {})
        .split(function () {})
        .reachEnd(function () {})
      par.build()
    })
    done()
  })
  it('throws on wrong stage', function (done) {
    assert.throws(function () {
      var par = sb
        .DoWhile()
        .stage(1)
        .split(function () {})
        .reachEnd(function () {})
      par.build()
    })
    done()
  })
})

describe('IfElse', function (done) {
  it('inits', function (done) {
    var par = sb
      .If(function () {})
      .then(function () {})
      .else(function () {})
    assert(par.cfg.condition)
    assert(par.cfg.success)
    assert(par.cfg.failed)
    done()
  })
  it('Built', function (done) {
    var par = sb
      .If(function () {})
      .then(function () {})
      .else()
    var p = par.build()
    assert(p instanceof IfElse)
    done()
  })
  it('not throws on empty stage', function (done) {
    assert.doesNotThrow(function () {
      var par = sb
        .If(function () {})
        .then()
        .then(function () {})
        .else(function () {})
      par.build()
    })
    done()
  })
  it('throws on wrong stage', function (done) {
    assert.throws(function () {
      var par = sb
        .If(1)
        .then(function () {})
        .else(function () {})
      par.build()
    })
    done()
  })
})

describe('MultiWaySwitch', function (done) {
  it('intis', function (done) {
    var sw = sb
      .MWS()
      .name('MWS')
      .combine(function () {})
      .split(function () {})
      .case(sb.MWCase())
      .case({
        stage: new Stage(),
      })
      .case(function () {})
      .case()
    assert(sw.cfg.name)
    assert(sw.cfg.combine)
    assert(sw.cfg.split)
    assert(sw.cfg.cases.length === 3)
    done()
  })

  it('Built', function (done) {
    debugger
    var sw = sb
      .MWS()
      .name('MWS')
      .combine(function () {})
      .split(function () {})
      .case(sb.MWCase())
      .case({
        stage: new Stage(),
      })
      .case(function () {})
      .case()
    var swb = sw.build()
    assert(!swb.cases[0].stage)
    assert(swb.cases[1].stage instanceof Stage)
    assert(swb instanceof MultiWaySwitch)
    assert(swb.cases.length === 3)
    done()
  })
})

describe('Promises/A+ extension', function () {
  it('Can promise value', function (done) {
    var promised = sb
      .Stage(function (ctx) {
        ctx.some += 1
      })
      .build()
      .promise({
        some: 1,
      })

    promised
      .then(function (ctx) {
        assert(ctx.some == 2)
        return ctx
      })
      .then(
        function (ctx) {
          debugger
          done()
        },
        function (err) {
          assert(!err)
          done()
        },
      )
  })

  it('Can promise value', function (done) {
    var promised = sb
      .Stage(function (ctx) {
        ctx.some += 1
      })
      .build()
      .promise()
    debugger

    promised
      .then(function (ctx) {
        assert(ctx.some == 2)
        return ctx
      })
      .then(function (ctx) {
        assert(false)
      })
      .then(null, function (err) {
        assert(err)
        done()
      })
  })

  it('Can promises can be chained together', function (done) {
    debugger
    var promised1 = sb
      .Stage(function (ctx) {
        ctx.some += 1
      })
      .build()
      .promise({
        some: 1,
      })

    var promised2 = sb
      .Stage(function (ctx) {
        ctx.some += 1
      })
      .build()

    promised1
      .then(function (ctx) {
        return promised2.promise(ctx)
      })
      .then(function (ctx) {
        assert(ctx.some == 3)
        done()
      })
  })

  it('Can promise value as promise', function (done) {
    var promised = sb
      .Stage(function (ctx) {
        ctx.some += 1
      })
      .build()
      .promise({
        some: 1,
      })
      .then(function (ctx) {
        assert(ctx.some == 2)
      })
      .then(function () {
        done()
      })
  })

  it('can be deferred with promise', function (done) {
    var prom = sb
      .Stage(function (ctx) {
        ctx.some += 1
      })
      .build()
      .promise({
        some: 1,
      })

    var prom2 = sb
      .Stage(function (ctx, done) {
        setTimeout(function () {
          ctx.some += 10
          done()
        })
      })
      .build()
      .toCallback()

    prom.then(function (ctx) {
      assert(ctx.some == 2)
      return ctx
    })

    var prom3 = prom
      .then(function (ctx1) {
        assert(ctx1.some == 2)
        return ctx1
      })
      .then(function (ctx) {
        ctx.some += 10
        return ctx
      })
      .then(function (ctx1) {
        assert((ctx1.some = 12))
        return ctx1
      })
      .then(function (ctx) {
        done()
      })
  })
})

describe('strange Errors', function () {
  it('must compile', function (done) {
    sb.Pipeline()
      .then(function (ctx) {
        ctx.item = {}
      })
      .then(
        sb
          .If(function (ctx) {
            return (
              ctx.$options.req.session &&
              ctx.$options.req.session.authInfo &&
              ctx.$options.req.session.authInfo.uiProfile.tenantDbUrl
            )
          })
          .then(
            sb
              .Pipeline()
              .stage(
                sb
                  .MWS()
                  .name('getConnection')
                  .case(
                    sb.MWCase().stage(function (ctx, done) {
                      ctx.getDb('tenant', function (err, db) {
                        if (!err) {
                          ctx.sellerdb = db
                        }
                        done(err)
                      })
                    }),
                  )
                  .case(
                    sb.MWCase().stage(function (ctx, done) {
                      ctx.getDb('system', function (err, db) {
                        if (!err) {
                          ctx.sellerdb = db
                        }
                        done(err)
                      })
                    }),
                  ),
              )
              .then(),
          )
          .else(
            sb
              .Pipeline(function (ctx, done) {
                ctx.getDb('system', SERVERCONFIG.db.url, function (err, systemdb) {
                  if (!err) {
                    ctx.systemdb = systemdb
                  }
                  done(err)
                })
              })
              .then(function (ctx, done) {
                CustomQuery.getTenantsConnectionStrings(ctx.systemdb, {}, function (err, connectionStignArray) {
                  if (!err && connectionStignArray) {
                    ctx.connectionStignArray = connectionStignArray
                  }
                  done(err)
                })
              })
              .then(
                sb
                  .Parallel()
                  .split(function (ctx) {
                    return ctx.connectionStignArray.map(function (cs) {
                      return {
                        connection: cs,
                      }
                    })
                  })
                  .stage(
                    sb
                      .Pipeline()
                      .stage(function (ctx, done) {
                        ctx.getDb(ctx.connection, ctx.connection, function (err, db) {
                          if (!err) {
                            ctx.tenantDb = db
                          }
                          done(err)
                        })
                      })
                      .then(function (ctx, done) {
                        var query =
                          Object.getOwnPropertyNames(ctx.$options.req.query).length > 0
                            ? ctx.$options.req.query
                            : ctx.$options.req.body
                        var catalogLink = query.link_catalog ? query.link_catalog : ''
                        CustomQuery.FindLink(
                          ctx.tenantDb,
                          {
                            catalogLink: catalogLink,
                          },
                          function (err, isTenant) {
                            if (!err && isTenant) {
                              ctx.sellerdb = ctx.tenantDb
                              ctx.isTenant = true
                            } else {
                              ctx.remove(ctx.connection)
                            }
                            done(err)
                          },
                        )
                      }),
                  )
                  .combine(function (ctx, children) {
                    var child
                    for (var i = 0, len = children.length; i < len; i++) {
                      child = children[i]
                      if (ctx.isTenant) {
                        ctx.sellerdb = ctx.tenantDb
                      }
                    }
                  }),
              ),
          ),
      )
      .then(function (ctx, done) {
        pipeFunction()
      })
      .build()
    done()
  })

  it('stage is reusable with build', function (done) {
    var stage = sb
      .Pipeline()
      .then(function (ctx) {
        if (ctx.done) ctx.done++
        else ctx.done = 1
      })
      .then(function (ctx, done) {
        setTimeout(function () {
          if (ctx.async) ctx.async += 10
          else ctx.async = 10
          done()
        }, 10)
      })

    var s = sb.Pipeline(stage).then(stage).then(stage)
    debugger
    s = s.build()
    // s = s.toCallback();
    s.execute({}, function (err, ctx) {
      console.log(ctx.done)
      console.log(ctx.async)
      assert(ctx.done === 3)
      assert(ctx.async === 30)
      done()
    })
  })
})
