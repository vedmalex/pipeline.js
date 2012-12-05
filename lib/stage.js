var util = require('util');
var EventEmitter = require("events").EventEmitter;

function Stage(config) {
	if(config){
		if(typeof(config) === 'object'){
			if(typeof(config.run) === 'function') this.run = config.run;
			if(typeof(config.ensure) === 'function') this.ensure = config.ensure;
		} else if(typeof(config) === 'function')
			this.run = config;
	}
	EventEmitter.call(this);
}
exports.Stage = Stage;

util.inherits(Stage, EventEmitter);

Stage.prototype.ensure = function(context, callback) {
	if(typeof(callback) == 'function') callback(null, context);
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