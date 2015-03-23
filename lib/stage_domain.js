/*!
 * Module dependency
 */
var Context = require('./context').Context;
var EventEmitter = require("events").EventEmitter;
var schema = require('js-schema');
var util = require('./util').Util;

/** 
 * The Stage class, core of the pipeline.js
 * 	this one uses `domain` to catch all errors.
 * 	
 * ##events:
 * 
 * 	- `error`
 *		error whiule executing stage
 * 	- `done`
 * 		resulting context of staging
 * 	- `end`
 *		examine that stage executing is complete
 *
 * ##General Stage definition**
 *
 * 		###Configuration
 *
 *			`config` as `Object`:
 * 			- ensure
 *				method for ensuring the context
 * 			- rescue
 *				method for rescue stage from errors
 * 			- validate
 *				validate contect method
 * 			- schema
 *				schema validation for context
 * 			- run
 *				the method that will be evaluated as worker
 *
 * 		###config as Function
 *  		
 * 			`config` is the `run` method of the stage
 *
 * 		###config as String
 *
 *  		`config` is the `name` of the stage
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
Stage.prototype.rescue = function(err, context, callback) {
	if (typeof callback === 'function') {
		callback(err);
	} else {
		return err;
	}
};

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

/*!
 * failproff wrapper for Sync call
 */
function failproofSyncCall(d, _this, _fn, finalize) {
	var fn = function() {
		var failed = false;
		var args = Array.prototype.slice.call(arguments);
		try {
			_fn.apply(_this, args);
		} catch (err) {
			failed = true;
			d.emit('error', err);
		}
		if (!failed) {
			finalize();
		}
	};
	return d.bind(function() {
		var args = Array.prototype.slice.call(arguments);
		args.unshift(fn);
		setImmediate.apply(null, args);
	});
}

/*!
 * failproff wrapper for Async call
 */
function failproofAsyncCall(d, _this, _fn) {
	var fn = function() {
		var args = Array.prototype.slice.call(arguments);
		try {
			_fn.apply(_this, args);
		} catch (err) {
			d.emit('error', err);
		}
	};
	return d.bind(function() {
		var args = Array.prototype.slice.call(arguments);
		args.unshift(fn);
		setImmediate.apply(null, args);
	});
}

/**
 * executes stage and return result to callback
 * always async
 * @param _context Context|Object incoming context
 * @param callback Function incoming callback function function(err, ctx)
 */
Stage.prototype.execute = function(_context, callback) {
	var self = this;
	var d = require('domain').create();
	var ensureAsync = failproofAsyncCall.bind(undefined, d);
	var ensureSync = failproofSyncCall.bind(undefined, d);
	d.add(self);
	d.on('error', finalizeIt);

	var context = Context.ensure(_context);
	var hasCallback = typeof(callback) === 'function';

	function afterErrorCheck(err) {
		if (err) {
			context.addError(err);
			if (self.listeners('error').length > 0) {
				self.emit('error', err, context);
			}
		} else {
			self.emit('done', context);
		}

		self.emit('end', context);

		if (hasCallback) {
			d.exit(); // exit from domain;
			// setImmediate(function(err, context) {
				callback(err, context);
			// }, err, context);
		}
	}

	function finalizeIt(_err) {
		var err;
		if (_err) {
			var len = self.rescue.length;
			switch (len) {
				case 1:
					afterErrorCheck(self.rescue(_err));
					break;

				case 2:
					err = self.rescue(_err, context);
					afterErrorCheck(err);
					break;

				case 3:
					self.rescue(_err, context, afterErrorCheck);
					break;

				default:
					afterErrorCheck(err);
			}
		} else {
			afterErrorCheck();
		}
	}

	function afterEnsure(err) {
		if (!err) { // passing 
			if (typeof(self.run) == 'function') {

				if (context.__trace) {
					context.addToStack('context', context.toObject());
					// console.log(self.name);
				}
				var hasError = null;
				switch (self.run.length) {
					case 0:
						ensureSync(context, self.run, finalizeIt)();
						break;
					case 1:
						ensureSync(self, self.run, finalizeIt)(context);
						break;
					case 2:
						ensureAsync(self, self.run)(context, finalizeIt);
						break;
					case 3:
						ensureAsync(self, self.run)(null, context, finalizeIt);
						break;
					default:
						ensureAsync(self, finalizeIt(new Error('unacceptable signature')));
				}
			} else {
				ensureAsync(self, finalizeIt(new Error(self.reportName() + ' reports: run is not a function')));
			}
		} else {
			ensureAsync(self, finalizeIt(err));
		}
	}

	self.sign(context);
	switch (self.ensure.length) {
		case 2:
			self.ensure(context, afterEnsure);
			break;
		case 1:
			var verr = self.ensure(context);
			afterEnsure(verr);
			break;
		default:
			finalizeIt(new Error('unknown ensure signature'));
	}
};

/*!
 * exports
 */
exports.Stage = Stage;