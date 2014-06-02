var Context = require('./context').Context;
var EventEmitter = require("events").EventEmitter;
var schema = require('js-schema');
var util = require('./util.js').Util;

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
			if (typeof(config.validate) === 'function') {
				self.validate = config.validate;
			}
			if (typeof(config.schema) === 'object') {
				// override validate method
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

exports.Stage = Stage;
util.inherits(Stage, EventEmitter);

var StageProto = Stage.prototype;

StageProto.reportName = function() {
	var self = this;
	return 'STG:' + (self.name ? (' ' + self.name) : '');
};

StageProto.ensure = function(context, callback) {
	var self = this;
	if (self.validate(context)) {
		if (typeof(callback) == 'function') {
			callback(null);
		}
	} else {
		callback(new Error(self.reportName() + ' reports: Context is invalid'));
	}
};

StageProto.name = undefined;

StageProto.validate = function(context) {
	return true;
};

StageProto.sign = function(context) {
	var self = this;
	if (context instanceof Context) {
		context.$$$signWith(self.reportName());
	}
};

StageProto.emitAnyway = false;

StageProto.run = 0;

StageProto.execute = function(_context, callback) {
	var context = Context.ensure(_context);
	var hasCallback = typeof(callback) == 'function';
	var self = this;
	self.sign(context);
	self.ensure(context, function(err) {
		if (!err) {
			if (typeof(self.run) == 'function') {
				setImmediate(function() {
					// проверять если вдруг сигнатура не имеет трех параметров....
					// возможно (err, callback) -> context передавать в run.apply()
					if (context.$$$trace) {
						context.addToStack('context', context.toObject());
					}
					self.run(null, context, function(err) {
						// продумать подробнее что можно улучшить...
						// наверное лишнее??
						// context.addToStack('after', context.toObject());
						if (hasCallback) {
							callback(err, context);
						}
						if (!hasCallback || self.emitAnyway) {
							if (err) {
								context.addError(err);
								self.emit('error', err, context);
							} else self.emit('done', context);
						}
					});
				});
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