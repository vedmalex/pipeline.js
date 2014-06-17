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
 * ####emitAnyway
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

			if (config.emitAnyway === true) {
				self.emitAnyway = true;
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
// internal
Stage.prototype.sign = function(context) {
	var self = this;
	if (context instanceof Context) {
		context.__signWith(self.reportName());
	}
};

Stage.prototype.emitAnyway = false;

Stage.prototype.run = 0;

Stage.prototype.execute = function(_context, callback) {
	
	var self = this;
	var context = Context.ensure(_context);
	var hasCallback = typeof(callback) === 'function';
	
	self.sign(context);
	self.ensure(context, function(err) {
		
		if (!err) { // passing 
			
			if (typeof(self.run) == 'function') {

				var cb = function(err) {

					if (hasCallback) {
						callback(err, context);
					}

					if (!hasCallback || self.emitAnyway) {

						if (err) {
							context.addError(err);
							self.emit('error', err, context);
						} else {
							self.emit('done', context);
						}
					}
				};

				if (context.__trace) {
					context.addToStack('context', context.toObject());
				}

				var hasError = null;

				switch (self.run.length) {

					case 0:
						try {
							self.run.apply(context);
						} catch (e) {
							hasError = e;
						}
						cb(hasError);
						break;

					case 1:
						try {
							self.run(context);
						} catch (e) {
							hasError = e;
						}
						cb(hasError);
						break;

					case 2:
						setImmediate(function() {
							self.run(context, cb);
						});
						break;

					case 3:
						setImmediate(function() {
							self.run(null, context, cb);
						});
						break;

					default:
						cb(new Error('unaceptable signature'));
				}

			} else {
				var runIsNotAFunction = new Error(self.reportName() + ' reports: run is not a function');
				context.addError(runIsNotAFunction);

				if (hasCallback) {
					callback(runIsNotAFunction, context);
				}

				if (!hasCallback || self.emitAnyway) {
					self.emit('error', runIsNotAFunction, context);
				}
			}
		} else {

			if (hasCallback) {
				callback(err, context);
			}

			if (!hasCallback || self.emitAnyway) {
				context.addError(err);
				self.emit('error', err, context);
			}
		}
	});
};

/*!
 * exports
 */
exports.Stage = Stage;