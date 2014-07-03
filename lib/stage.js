/*!
 * Module dependency
 */
var Context = require('./context').Context;
var EventEmitter = require("events").EventEmitter;
var schema = require('js-schema');
var util = require('./util').Util;

/** 
 * General Stage definition
 * ##Configuration
 *
 * ###config as `Object`
 *
 * ####ensure
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

/*!
 * prototype
 */

Stage.prototype.reportName = function() {
	var self = this;
	return 'STG:' + (self.name ? (' ' + self.name) : '');
};

// by default use validate 
// internal
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

Stage.prototype.name = undefined;
// return true false
Stage.prototype.validate = function(context) {
	return true;
};

/**
 * Allpurpose Error handler for stage
 * @param err Error|null
 * @param context Context
 * return Error|undefined|null
 */

Stage.prototype.rescue = function(err, context) {
	return err;
};

// internal
Stage.prototype.sign = function(context) {
	var self = this;
	if (context instanceof Context) {
		context.__signWith(self.reportName());
	}
};

Stage.prototype.run = 0;

function failproofSyncCall(d, _fn, finalize) {
	var fn = function() {
		var failed = false;
		var args = Array.prototype.slice.call(arguments);
		try {
			_fn.apply(this, args);
		} catch (err) {
			failed = true;
			d.emit('error', err);
		} if(!failed){
			finalize();
		}
	};
	return d.bind(function() {
		var args = Array.prototype.slice.call(arguments);
		args.unshift(fn);
		setImmediate.apply(null, args);
	});
}

function failproofAsyncCall(d, _fn) {
	var fn = function() {
		var args = Array.prototype.slice.call(arguments);
		try {
			_fn.apply(this, args);
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

Stage.prototype.execute = function(_context, callback) {
	var self = this;
	var d = require('domain').create();
	var ensureAsync = failproofAsyncCall.bind(undefined, d);
	var ensureSync = failproofSyncCall.bind(undefined, d);
	d.add(self);
	d.on('error', finalizeIt);

	var context = Context.ensure(_context);
	var hasCallback = typeof(callback) === 'function';

	function finalizeIt(_err) {
		var err;
		if (_err) {
			err = self.rescue(_err, context);
		}

		if (hasCallback) {
			callback(err, context);
		}

		if (err) {
			context.addError(err);
			if (self.listeners('error').length > 0) {
				self.emit('error', err, context);
			}
		} else {
			self.emit('done', context);
		}

		self.emit('end', context);
	}

	self.sign(context);
	self.ensure(context, function(err) {

		if (!err) { // passing 
			if (typeof(self.run) == 'function') {

				if (context.__trace) {
					context.addToStack('context', context.toObject());
				}
				var hasError = null;
				switch (self.run.length) {
					case 0:
						ensureSync(self.run, finalizeIt).apply(context);
						break;
					case 1:
						ensureSync(self.run, finalizeIt)(context);
						break;
					case 2:
						ensureAsync(self.run)(context, finalizeIt);
						break;
					case 3:
						ensureAsync(self.run)(null, context, finalizeIt);
						break;
					default:
						ensureAsync(finalizeIt(new Error('unaceptable signature')));
				}

			} else {
				var runIsNotAFunction = new Error(self.reportName() + ' reports: run is not a function');
				context.addError(runIsNotAFunction);

				if (hasCallback) {
					callback(runIsNotAFunction, context);
				}
				if (self.listeners('error').length > 0) {
					self.emit('error', runIsNotAFunction, context);
				}
				self.emit('end');
			}
		} else {

			if (hasCallback) {
				callback(err, context);
			}
			context.addError(err);
			if (self.listeners('error').length > 0) {
				self.emit('error', err, context);
			}
			self.emit('end');
		}
	});
};

/*!
 * exports
 */
exports.Stage = Stage;