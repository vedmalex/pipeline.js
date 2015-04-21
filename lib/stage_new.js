/*!
 * Module dependency
 */
// var domain = require("domain");
var Context = require('./context').Context;
var EventEmitter = require("events").EventEmitter;
var schema = require('js-schema');
var util = require('./util').Util;

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

	var self = this;

	if (!(self instanceof Stage)) {
		throw new Error('constructor is not a function');
	}

	if (config) {

		if (typeof(config) === 'object') {

			if (typeof(config.ensure) === 'function') {
				self.ensure = config.ensure;
			}

			if (typeof(config.rescue) === 'function') {
				self.rescue = config.rescue;
			} else {
				self.rescue = undefined;
			}

			if (config.validate && config.schema) {
				throw new Error('use either validate or schema');
			}


			if (typeof(config.validate) === 'function') {
				self.validate = config.validate;
			}

			if (typeof(config.schema) === 'object') {
				self.validate = schema(config.schema);
			}

			if (!config.validate && !config.schema && !config.ensure) {
				self.ensure = undefined;
			}

			if (typeof(config.run) === 'function') {
				self.run = config.run;
			}
		} else {

			if (typeof(config) === 'function') {
				self.run = config;
			}
		}

		if (typeof(config) === 'string') {
			self.name = config;
		} else {

			if (config.name) {
				self.name = config.name;
			} else {
				var match = self.run.toString().match(/function\s*(\w+)\s*\(/);

				if (match && match[1]) {
					self.name = match[1];
				} else {
					self.name = self.run.toString();
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
Stage.prototype.reportName = function() {
	var self = this;
	return 'STG:' + (self.name ? (' ' + self.name) : '');
};

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
Stage.prototype.ensure = function(context, callback) {
	var self = this;
	var validation = self.validate ? self.validate(context) : true;

	if (validation) {
		if ('boolean' === typeof validation) {
			callback(null, context);
		} else {
			callback(validation, context);
		}
	} else {
		callback(new Error(self.reportName() + ' reports: Context is invalid'), context);
	}
};

/**
 * internal storage for name
 */
Stage.prototype.name = undefined;

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
 * @param err Error|null
 * @param context Context
 * @param [callback] Function callback for async rescue process
 * return Error|undefined|null
 *
 * it can be also sync like this
 *```javascript
 * Stage.prototype.rescue = function(err, context) {
 *		// verys simple error check with context ot without it
 *		return err;
 *	};
 *```
 */

Stage.prototype.rescue = function(err, context, callback) {
	if (typeof callback === 'function') {
		callback(err, context);
	} else {
		return err;
	}
};

/**
 * run function, can be assigned by child class
 * Singature
 * function(err, ctx, done) -- async with custom error handler!
 * > NOTE: All errors must be handled withing the function.
 * function(ctx, done) -- async
 * function(ctx) -- sync call
 * function() -- sync call `context` applyed as this for function.
 */

Stage.prototype.finishIt = function(err, context, callback) {
	if (callback instanceof Function) {
		callback(err, context);
	}
};

Stage.prototype.handleError = function(_err, context, callback) {
	var self = this;
	if (_err && !(_err instanceof Error)) {
		if ('string' === typeof _err)
			_err = Error(_err);
	}

	var len = self.rescue ? self.rescue.length : -1;
	switch (len) {
		case 0:
			self.finishIt(self.rescue(), context, callback);
			break;

		case 1:
			self.finishIt(self.rescue(_err), context, callback);
			break;

		case 2:
			self.finishIt(self.rescue(_err, context), context, callback);
			break;

		case 3:
			self.rescue(_err, context, function(err) {
				self.finishIt(err, context, callback);
			});
			break;

		default:
			self.finishIt(_err, context, callback);
	}
};

Stage.prototype.doneIt = function(err, context, callback) {
	var self = this;
	if (err) {
		self.handleError(err, context, callback);
	} else {
		self.finishIt(undefined, context, callback);
	}
};

var failproofSyncCall = require('./util.js').failproofSyncCall;
var failproofAsyncCall = require('./util.js').failproofAsyncCall;

Stage.prototype.run = 0;

// var Factory = require('fte.js').Factory;

// var f = new Factory({
// 	root: ['./templates']
// });
/*

		var v = f.run({
			bg: summ
		}, 'template');

*/
Stage.prototype.compileItFte = function() {
	var code = f.run({
		self:this,
		run: this.run
	});
	this.run = eval(code);
};

Stage.prototype.compileIt = function() {
	var self = this;
	var done;

	var ensureAsync = failproofAsyncCall.bind(undefined, self.handleError.bind(self));
	var ensureSync = failproofSyncCall.bind(undefined, self.handleError.bind(self));

	var runStage = function(err, context, callback) {
		var done = function(err) {
			self.doneIt(err, context, callback);
		};
		if (typeof(self.run) == 'function') {
			if (err) {
				if (self.run.length == 3) {
					ensureAsync(self, self.run)(err, context, done);
				} else {
					self.handleError(err, context, callback);
				}
			} else {
				var hasError = null;
				switch (self.run.length) {
					case 0:
						ensureSync(context, self.run, done)();
						break;
					case 1:
						ensureSync(self, self.run, done)(context);
						break;
					case 2:
						ensureAsync(self, self.run)(context, done);
						break;
					case 3:
						ensureAsync(self, self.run)(null, context, done);
						break;
					default:
						self.handleError(new Error('unacceptable signature'), context, callback);
				}
			}
		} else {
			self.handleError(new Error(self.reportName() + ' reports: run is not a function'), context, callback);
		}
	};

	this.compiled = true;
	return function(err, _context, callback) {
		if (_context instanceof Function) {
			callback = _context;
			_context = err;
			err = undefined;
		} else if (!_context && !(err instanceof Error)) {
			_context = err;
			err = undefined;
			callback = undefined;
		}

		var context = Context.ensure(_context);

		var eLen = self.ensure ? self.ensure.length : -1;

		switch (eLen) {
			case 2:
				self.ensure(context, function(err, context) {
					runStage(err, context, callback);
				});
				break;
			case 1:
				runStage(self.ensure(context), context, callback);
				break;
			default:
				runStage(undefined, context, callback);
		}
	};
};

/**
 * executes stage and return result to callback
 * always async
 * @param _context Context|Object incoming context
 * @param callback Function incoming callback function function(err, ctx)
 */
Stage.prototype.execute = function(err, _context, callback) {
	if (!this.compiled) {
		this.run = this.compileIt(this.run);
	}
	this.run(err, _context, callback);
};

/*!
 * toString
 */
Stage.prototype.toString = function() {
	return "[pipeline Stage]";
};

/*!
 * exports
 */
exports.Stage = Stage;