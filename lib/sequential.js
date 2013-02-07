var Stage = require('./stage').Stage;
var util = require('util');

function Sequential(stage, split, reachEnd, combine) {
	Stage.apply(this);

	if(stage instanceof Stage)
		this.stage = stage;
	else if(stage instanceof Function)
		this.stage = new Stage(stage);
	else this.stage = new Stage();

	this.split = split instanceof Function ? split : function(ctx, iter) {
		return ctx;
	};
	this.reachEnd = reachEnd instanceof Function ? reachEnd : function(err, ctx, iter) {
		return true;
	};
	this.combine = combine instanceof Function ? combine : null;
}

util.inherits(Sequential, Stage);

exports.Sequential = Sequential;
var StageProto = Sequential.super_.prototype;
var SequentialProto = Sequential.prototype;

SequentialProto.compile = function() {
	var self = this;
	var run = function(err, ctx, done) {
			var iter = -1;
			var childsCtx = [];
			var combine = function(err) {
					if(!err && self.combine) self.combine(ctx, childsCtx);
					done(err);
				};
			var next = function(err, retCtx) {
					iter++;
					if(iter > 0)
						childsCtx.push(retCtx);
					if(self.reachEnd(err, ctx, iter)) combine(err, iter);
					else {
						self.stage.execute(self.split(ctx, iter), next);
					}
				};
			next();
		};
	self.run = run;
};

SequentialProto.execute = function(context, callback) {
	var self = this;
	if(!self.run) self.compile();
	StageProto.execute.apply(this, arguments);
};