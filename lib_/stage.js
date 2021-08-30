/*!
 * Module dependency
 */
var EventEmitter = require('events').EventEmitter
var schema = require('js-schema')
var util = require('./util').Util
var useDIN = process.env['USEFTE']
var useVm = useDIN && useDIN === 'vm'
var useEval = useDIN && useDIN === 'eval'
var semver = require('semver')
var useImmediate =
  semver.major(process.versions.node) === 0 &&
  semver.minor(process.versions.node) <= 10

/**
 * The Stage class, core of the pipeline.js
 *
 * **events**:
 *
 *- `error`
 *		error whiule executing stage
 *- `done`
 * 		resulting context of staging
 *- `end`
 *		examine that stage executing is complete
 *
 * **General Stage definition**
 *
 * - `config` as `Object`:
 * 	- ensure
 *   method for ensuring the context
 * 	- rescue
 *	 method for rescue stage from errors
 * 	- validate
 *	 validate contect method
 * 	- schema
 *	 schema validation for context
 * 	- run
 *	 the method that will be evaluated as worker
 *
 * - `config` as `Function`
 *
 *  - `config` is the `run` method of the stage
 *
 * 	- `config` as `String` is the `name` of the stage
 *
 * @param {Object|Function|String} config Stage configuration
 * @api public
 */
function Stage(config) {
  var self = this

  if (!(self instanceof Stage)) {
    throw new Error('constructor is not a function')
  }

  if (config) {
    if (typeof config === 'object') {
      if (typeof config.ensure === 'function') {
        self.ensure = config.ensure
      }

      if (typeof config.rescue === 'function') {
        self.rescue = config.rescue
      } else {
        self.rescue = undefined
      }

      if (config.validate && config.schema) {
        throw new Error('use either validate or schema')
      }

      if (typeof config.validate === 'function') {
        self.validate = config.validate
      }

      if (typeof config.schema === 'object') {
        self.validate = schema(config.schema)
      }

      if (!config.validate && !config.schema && !config.ensure) {
        self.ensure = undefined
      }

      if (typeof config.run === 'function') {
        self.run = config.run
      }
    } else {
      if (typeof config === 'function') {
        self.run = config
      }
    }

    if (typeof config === 'string') {
      self.name = config
    } else {
      if (config.name) {
        self.name = config.name
      } else {
        var match = self.run.toString().match(/function\s*(\w+)\s*\(/)

        if (match && match[1]) {
          self.name = match[1]
        } else {
          self.name = self.run.toString()
        }
      }
    }
  }
}

/*!
 * Inherited from Event Emitter
 */
// util.inherits(Stage, EventEmitter);

/**
 * provaide a way to get stage name for reports used for tracing
 * @return String
 */
Stage.prototype.reportName = function () {
  var self = this
  return 'STG:' + (self.name ? ' ' + self.name : '')
}

/**
 * Ensures context validity
 * this can be overridden by user
 * in sync or async way
 * in sync way it has signature
 * `function(context):Error` so it must return error if context is invalid
 * sync signature
 * @param {Context} context
 * @param {Function} callback
 */
Stage.prototype.ensure = function (context, callback) {
  var self = this
  var validation = self.validate ? self.validate(context) : true

  if (validation) {
    if ('boolean' === typeof validation) {
      callback(null, context)
    } else {
      callback(validation, context)
    }
  } else {
    callback(
      new Error(self.reportName() + ' reports: Context is invalid'),
      context,
    )
  }
}

/**
 * internal storage for name
 */
Stage.prototype.name = undefined

/**
 * default `validate` implementation
 * @param {Context} validatee
 */
// Stage.prototype.validate = function(context) {
// 	return true;
// };

/**
 * Allpurpose Error handler for stage
 * it must return na Error or undefined,
 * by default it renturns error but one can override it with some business ligic
 * @param Error|null err
 * @param Context context
 * @param Function [callback] callback for async rescue process
 * @returns {Error|undefined|null}
 *
 * it can be also sync like this
 *```javascript
 * Stage.prototype.rescue = function(err, context) {
 *		// very simple error check with context ot without it
 *		return err;
 *	};
 *```
 */

Stage.prototype.rescue = function (err, context, callback) {
  if (typeof callback === 'function') {
    callback(err, context)
  } else {
    return err
  }
}

/**
 * run function, can be assigned by child class
 * Singature
 * function(err, ctx, done) -- async with custom error handler!
 * > NOTE: All errors must be handled withing the function.
 * function(ctx, done) -- async
 * function(ctx) -- sync call
 * function() -- sync call `context` applyed as this for function.
 */

if (useImmediate) {
  Stage.prototype.finishIt = function (err, context, callback) {
    if (callback instanceof Function) {
      setImmediate(function () {
        callback(err, context)
      })
    }
  }
} else {
  Stage.prototype.finishIt = function (err, context, callback) {
    if (callback instanceof Function) {
      process.nextTick(function () {
        callback(err, context)
      })
    }
  }
}

Stage.prototype.handleError = function (_err, context, callback) {
  var self = this
  if (_err && !(_err instanceof Error)) {
    if ('string' === typeof _err) _err = Error(_err)
  }

  var len = self.rescue ? self.rescue.length : -1
  switch (len) {
    case 0:
      self.finishIt(self.rescue(), context, callback)
      break

    case 1:
      self.finishIt(self.rescue(_err), context, callback)
      break

    case 2:
      self.finishIt(self.rescue(_err, context), context, callback)
      break

    case 3:
      self.rescue(_err, context, function (err) {
        self.finishIt(err, context, callback)
      })
      break

    default:
      self.finishIt(_err, context, callback)
  }
}

Stage.prototype.doneIt = function (err, context, callback) {
  var self = this
  if (err) {
    self.handleError(err, context, callback)
  } else {
    self.finishIt(undefined, context, callback)
  }
}

var fpSyncCall = require('./util.js').failproofSyncCall
var fpAsyncCall = require('./util.js').failproofAsyncCall

Stage.prototype.run = 0

var Factory = require('fte.js').Factory

var f = new Factory({
  root: ['./'],
})

if (useVm) {
  var vm = require('vm')
}

Stage.prototype.compileItFte = function () {
  var self = this
  var code
  if (useVm) {
    code = f.run(
      {
        self: this,
      },
      __dirname + '/templates/stage_vm.njs',
      true,
    )
    vm.runInNewContext(
      code,
      {
        THIS: this,
        Context: Context,
        fpAsyncCall: fpAsyncCall,
        fpSyncCall: fpSyncCall,
      },
      {
        filename: 'compiledStage',
      },
    )
  } else if (useEval) {
    code = f.run(
      {
        self: this,
      },
      __dirname + '/templates/stage_eval.njs',
      true,
    )
    this.exec = eval(code)
  } else {
    throw new Error('unknown Dinamic booster for pipeline.js')
  }

  this.compiled = true
}

Stage.prototype.compileIt = function (_val) {
  var self = this

  if (typeof _val == 'function') {
    var val = _val.bind(self)
    var runStage = function (err, context, callback) {
      var done = function (err) {
        self.doneIt(err, context, callback)
      }
      var failed = false
      var hasError = null
      switch (_val.length) {
        case 0:
          if (err) return self.handleError(err, context, callback)
          try {
            _val.apply(context)
          } catch (er) {
            var failed = true
            self.handleError(er, context, callback)
          }
          if (!failed) {
            done()
          }
          break
        case 1:
          if (err) return self.handleError(err, context, callback)
          try {
            val(context)
          } catch (er) {
            failed = true
            self.handleError(er, context, callback)
          }
          if (!failed) {
            done()
          }
          break
        case 2:
          if (err) return self.handleError(err, context, callback)
          try {
            val(context, done)
          } catch (er) {
            self.handleError(er, context, callback)
          }
          break
        case 3:
          try {
            val(err, context, done)
          } catch (er) {
            self.handleError(er, context, callback)
          }
          break
        default:
          self.handleError(
            new Error('unacceptable signature'),
            context,
            callback,
          )
      }
    }

    this.compiled = true
    return function (err, context, callback) {
      var eLen = self.ensure ? self.ensure.length : -1

      switch (eLen) {
        case 2:
          self.ensure(context, function (err, context) {
            runStage(err, context, callback)
          })
          break
        case 1:
          runStage(self.ensure(context), context, callback)
          break
        default:
          runStage(undefined, context, callback)
      }
    }
  } else {
    return function (err, context, callback) {
      self.handleError(
        new Error(self.reportName() + ' reports: run is not a function'),
        context,
        callback,
      )
    }
  }
}

Stage.prototype.compile = function () {
  if (!useDIN) this.run = this.compileIt(this.run)
  else this.compileItFte()
}

/**
 * executes stage and return result to callback
 * always async
 * @param {Error} err error from previous execution
 * @param {Object} incoming context
 * @param {callback} Function incoming callback function function(err, ctx)
 */
Stage.prototype.execute = function (err, context, callback) {
  if (context instanceof Function) {
    callback = context
    context = err
    err = undefined
  } else if (!context && !(err instanceof Error)) {
    context = err
    err = undefined
    callback = undefined
  }
  if (!this.compiled) {
    this.compile()
  }
  if (!useDIN) this.run(err, context, callback)
  else this.exec(err, context, callback)
}

/*!
 * toString
 */
Stage.prototype.toString = function () {
  return '[pipeline Stage]'
}

/*!
 * exports
 */
exports.Stage = Stage
