var util = require('util');
var EventEmitter = require("events").EventEmitter;

function Stage() {
	EventEmitter.call(this);
}
exports.Stage = Stage;

util.inherits(Stage, EventEmitter);

Stage.prototype.ensureContext = function(context, callback) {
	if(typeof(callback) == 'function')
		callback(null, context);
};
Stage.prototype.execute = function(context) {
	var self = this;
	this.ensureContext(context, function(err){
		self.emit('done', err);
	});
};