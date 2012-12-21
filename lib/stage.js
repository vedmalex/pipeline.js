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
Stage.prototype.reportName = function(){
	return 'stage '+ Util.getClass(this);
};
Stage.prototype.ensure = function(context, callback) {
	if(this.validate(context)) {
		if(typeof(callback) == 'function') callback(null, context);
	} else callback(new Error(this.reportName() + ' reports: Context is invalid'));
};
Stage.prototype.validate = function(context) {
	if(this.schema) this.validate = schema(this.schema);
	else return true;
};
Stage.prototype.run = 0;
Stage.prototype.execute = function(context) {
	var self = this;
	self.ensure(context, function(err, context) {
		if(!err) {
			if(typeof(self.run) == 'function') {
				self.run(null, context, function(err) {
					if(err) self.emit('error', err);
					else self.emit('done');
				});
			} else self.emit('done');
		} else self.emit('error', err);
	});
};