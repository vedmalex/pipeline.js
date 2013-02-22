var Stage = require('./stage').Stage;
var util = require('util');

function IfElse(config) {
	if(!(this instanceof IfElse)) throw new Error('constructor is not a function');
	Stage.apply(this);
	if(!config) config = {};
	this.condition = config.condition instanceof Function ? config.condition : function(ctx) {
		return true;
	};

	if(config.success instanceof Stage) this.success = config.success;
	else if(config.success instanceof Function) this.success = new Stage(config.success);
	else this.success = new Stage();

	if(config.failed instanceof Stage) this.failed = config.failed;
	else if(config.failed instanceof Function) this.failed = new Stage(config.failed);
	else this.failed = new Stage();
}

util.inherits(IfElse, Stage);

exports.IfElse = IfElse;
var StageProto = IfElse.super_.prototype;
var IfElseProto = IfElse.prototype;

IfElseProto.compile = function() {
	var self = this;
	var run = function(err, ctx, done) {
			if(self.condition(ctx)) self.success.execute(ctx, done);
			else self.failed.execute(ctx, done);
		};
	self.run = run;
};

IfElseProto.execute = function(context, callback) {
	var self = this;
	if(!self.run) self.compile();
	StageProto.execute.apply(this, arguments);
};