var Stage = require('./stage').Stage;
var util = require('util');

function Parallel(stage, split, reachEnd, combine) {
	Stage.apply(this);

	if(stage instanceof Stage) this.stage = stage;
	else if(stage instanceof Function) this.stage = new Stage(stage);
	else this.stage = new Stage();

	this.split = split instanceof Function ? split : function(ctx) {
		return [ctx];
	};
	this.reachEnd = reachEnd instanceof Function ? reachEnd : function(err, ctx, iter) {
		return true;
	};
	this.combine = combine instanceof Function ? combine : null;
}

util.inherits(Parallel, Stage);

exports.Parallel = Parallel;
var StageProto = Parallel.super_.prototype;
var ParallelProto = Parallel.prototype;

ParallelProto.compile = function() {
	var self = this;
	var run = function(err, ctx, done) {
			var iter = 0;
			var childs = self.split(ctx);

			var len = childs.length;
			var finished = false;
			var next = function(index) {
					var combine = function(err) {
							if(!err && self.combine) self.combine(ctx, childs);
							finish(err);
						};

					function finish(err) {
						if(!finished) {
							finished = true;
							done(err);
						}
					}
					return function(err, retCtx) {
						iter++;
						if(iter > 0) childs[index] = retCtx;
						if(iter == len || self.reachEnd(err, ctx, iter)) combine(err);
					};
				};

			for(var i = 0; i < len; i++) {
				self.stage.execute(childs[i], next(i));
			}
		};
	self.run = run;
};

ParallelProto.execute = function(context, callback) {
	var self = this;
	if(!self.run) self.compile();
	StageProto.execute.apply(this, arguments);
};