var Stage = require('./stage').Stage;
var util = require('util');

function IfElse(condition, success, failed) {
	Stage.apply(this);
	this.condition = condition instanceof Function ? condition : function(ctx) {
		return true;
	};

	if(success instanceof Stage) this.success = success;
	else if(success instanceof Function) this.success = new Stage(success);
	else this.success = new Stage();

	if(failed instanceof Stage) this.failed = failed;
	else if(failed instanceof Function) this.failed = new Stage(failed);
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