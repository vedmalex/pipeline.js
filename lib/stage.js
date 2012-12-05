var util = require('util');
var EventEmitter = require("events").EventEmitter;

function Stage(run) {
	if(typeof(run) === 'function') this.run = run;
	EventEmitter.call(this);
}
exports.Stage = Stage;

util.inherits(Stage, EventEmitter);

Stage.prototype.ensureContext = function(context, callback) {
	if(typeof(callback) == 'function') callback(null, context);
};
Stage.prototype.run = 0;
Stage.prototype.execute = function(context) {
	var self = this;
	self.ensureContext(context, function(err, context) {
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