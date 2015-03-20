/*!
 * Module dependency
 */
// var domain = require("domain");
var Context = require('./context').Context;
var EventEmitter = require("events").EventEmitter;
require ('colors');
var schema = require('js-schema');
var util = require('./util').Util;

/** 
 * ##events:
 *
 * - `error` -- error whiule executing stage
 * - `done` -- resulting context of staging
 * - `end` -- examine that stage executing is complete
 
 * General Stage definition
 * ##Configuration
 *
 * ###config as `Object`
 *
 * ####ensure
 *
 * ####rescue
 *
 * ####validate
 *
 * ####schema
 *
 * ####run
 *
 * ###config as Function
 *
 *  `config` is the `run` method of the stage
 *
 * ###config as String
 *
 *  `config` is the `name` of the stage
 *
 * @param config {Object|Function|String} Stage configuration
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
	EventEmitter.call(self);
}

/*!
 * Inherited from Event Emitter
 */
util.inherits(Stage, EventEmitter);

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
 * @param context context
 * @param callback Function
 */
Stage.prototype.ensure = function(context, callback) {
	var self = this;
	var validation = self.validate(context);

	if (validation) {
		if ('boolean' === typeof validation) {
			callback(null);
		} else {
			callback(validation);
		}
	} else {
		callback(new Error(self.reportName() + ' reports: Context is invalid'));
	}
};

/**
 * internal storage for name
 */
Stage.prototype.name = undefined;

/**
 * default `validate` implementation
 */
Stage.prototype.validate = function(context) {
	return true;
};

/**
 * Allpurpose Error handler for stage
 * @param err Error|null
 * @param context Context
 * @param [callback] Function callback for async rescue process
 * return Error|undefined|null
 */

// потестировать разные rescue

Stage.prototype.rescue = function(err, context, callback) {
	if (typeof callback === 'function') {
		callback(err);
	} else {
		return err;
	}
};

/** it can be also sync like this */
/*	Stage.prototype.rescue = function(err, context) {
		// verys simple error check with context ot without it
		return err;
	};*/
/**/

/**
 * sing context with stage name.
 * used for tracing
 * @api internal
 */
Stage.prototype.sign = function(context) {
	var self = this;
	if (context instanceof Context) {
		context.__signWith(self.reportName());
	}
};

/**
 * run function, can be assigned by child class
 * Singature
 * function(err, ctx, done) -- async wit custom error handler! deprecated. err always null.
 * function(ctx, done) -- async
 * function(ctx) -- sync call
 * function() -- sync call `context` applyed as this for function.
 */
Stage.prototype.run = 0;
var failproofSyncCall = require('./util.js').failproofSyncCall;
var failproofAsyncCall = require('./util.js').failproofAsyncCall;
/**
 * executes stage and return result to callback
 * always async
 * @param _context Context|Object incoming context
 * @param callback Function incoming callback function function(err, ctx)
 */
Stage.prototype.execute = function(_context, callback) {
	var self = this;

	var context = Context.ensure(_context);
	var hasCallback = typeof(callback) === 'function';

	function handleError(_err) {
		if(_err && !(_err instanceof Error)) {
			console.log('error'.red + ' : '+'must be typeof of Error!!!'.yellow);
			var err = Error('error must be typeof of Error');
			console.log(err.stack.gray);
			// throw err;
		}

		function processError(err) {
			if (err) {
				if (self.listeners('error').length > 0) {
					// поскольку код вызывается в домене, 
					// то без листенера код вызовет рекурсию...
					self.emit('error', err, context);
				}
			}
			finishIt(err);
		}
		var len = self.rescue.length;
		switch (len) {
			case 0:
				processError(self.rescue());
				break;
			case 1:
				processError(self.rescue(_err));
				break;

			case 2:
				processError(self.rescue(_err, context));
				break;

			case 3:
				self.rescue(_err, context, processError);
				break;

			default:
				processError(_err);
		}
	}

	var ensureAsync = failproofAsyncCall.bind(undefined, handleError);
	var ensureSync = failproofSyncCall.bind(undefined, handleError);

	function finishIt(err) {
		self.emit('end', context);
		if (hasCallback) {
			setImmediate(function(err, context) {
				callback(err, context);
			}, err, context);
		}
	}

	//wrap it with errorcheck
	var doneIt = function(err) {
		if (err) {
			handleError(err);
		} else {
			self.emit('done', context);
			finishIt();
		}
	};

	// error handler


	runStage = function(err) {
		if (typeof(self.run) == 'function') {
			if (err) {
				if (self.run.length >= 3) {
					ensureAsync(self, self.run)(err, context, doneIt);
				} else {
					handleError(err);
				}
			} else {
				if (context.__trace) {
					context.addToStack('context', context.toObject());
					// console.log(self.name);
				}
				var hasError = null;
				switch (self.run.length) {
					case 0:
						ensureSync(context, self.run, doneIt)();
						break;
					case 1:
						ensureSync(self, self.run, doneIt)(context);
						break;
					case 2:
						ensureAsync(self, self.run)(context, doneIt);
						break;
					case 3:
						ensureAsync(self, self.run)(null, context, doneIt);
						break;
					default:
						handleError(new Error('unacceptable signature'));
				}
			}
		} else {
			handleError(new Error(self.reportName() + ' reports: run is not a function'));
		}
	};


	self.sign(context);
	switch (self.ensure.length) {
		case 2:
			self.ensure(context, runStage);
			break;
		case 1:
			runStage(self.ensure(context));
			break;
		default:
			handleError(new Error('unknown ensure signature'));
	}
};

/*!
 * exports
 */
exports.Stage = Stage;