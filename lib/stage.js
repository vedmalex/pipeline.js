var Context = require('./context').Context;
var util = require('util');
var EventEmitter = require("events").EventEmitter;
var schema = require('js-schema');
var Util = require('./util.js').Util;

function Stage(config) {
	if(config) {
		if(typeof(config) === 'object') {
			if(typeof(config.ensure) === 'function') this.ensure = config.ensure;
			if(typeof(config.validate) === 'function') this.validate = config.validate;
			if(typeof(config.schema) === 'object') {
				// override validate method
				this.validate = schema(config.schema);
			}
			if(typeof(config.run) === 'function') this.run = config.run;
		} else if(typeof(config) === 'function') this.run = config;
	}
	EventEmitter.call(this);
}
exports.Stage = Stage;
util.inherits(Stage, EventEmitter);
var StageProto = Stage.prototype;

StageProto.reportName = function(){
	return 'stage '+ Util.getClass(this);
};

StageProto.ensure = function(context, callback) {
	if(this.validate(context)) {
		if(typeof(callback) == 'function') callback(null);
	} else callback(new Error(this.reportName() + ' reports: Context is invalid'));
};
StageProto.validate = function(context) {
	return true;
};
StageProto.run = 0;
StageProto.execute = function(_context, callback) {
	var notContext = _context instanceof Context;
	var context = _context instanceof Context ? _context : new Context(_context);
	var self = this;
	self.ensure(context, function(err) {
		if(!err) {
			if(typeof(self.run) == 'function') {
				self.run(null, context, function(err) {
					if(typeof(callback) == 'function')
						callback(err, context);
					else {
						if(err) {
							context.addError(err);
							self.emit('error', err, context);
						}
						else self.emit('done', context);
					}
				});
			} else {
				var runIsNotAFunction = new Error(self.reportName() + ' reports: run is not a function');
				context.addError(runIsNotAFunction);
				if(typeof(callback) == 'function')
					callback(runIsNotAFunction, context);
				else
					self.emit('error', runIsNotAFunction, context);
			}
		} else {
			if(typeof(callback) == 'function') callback(err, context);
			else {
				context.addError(err);
				self.emit('error', err, context);
			}
		}
	});
};