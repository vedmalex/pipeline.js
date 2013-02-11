var Stage = require('./stage').Stage;
var util = require('util');

function Parallel(stage, split, exHandler, combine) {
	Stage.apply(this);

	if(stage instanceof Stage) this.stage = stage;
	else if(stage instanceof Function) this.stage = new Stage(stage);
	else this.stage = new Stage();

	this.split = split instanceof Function ? split : function(ctx) {
		return [ctx];
	};
	this.exHandler = exHandler instanceof Function ? exHandler : function(err, ctx, index) {
		return err;
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

			var len = childs ? childs.length : 0;
			var errors = [];
			var next = function(index) {
					function finish() {
						if(errors.length > 0) done(errors);
						else {
							if(!err && self.combine) self.combine(ctx, childs);
							done();
						}
					}

					function logError(err) {
						errors.push({index:index,err:err});
					}
					return function(err, retCtx) {
						iter++;
						if(iter > 0) childs[index] = retCtx;
						if(self.exHandler(err, ctx, index)) logError(err);
						if(iter == len) finish();
					};
				};

			for(var i = 0; i < len; i++) {
				self.stage.execute(childs[i], next(i));
			}

			if(len === 0) done();
		};
	self.run = run;
};

ParallelProto.execute = function(context, callback) {
	var self = this;
	if(!self.run) self.compile();
	StageProto.execute.apply(this, arguments);
};