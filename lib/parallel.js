var Stage = require('./stage').Stage;
var Context = require('./context').Context;
var util = require('./util.js').Util;

function Parallel(config) {
	var self = this;
	if (!(self instanceof Parallel)) {
		throw new Error('constructor is not a function');
	}
	Stage.apply(self);
	if (!config) {
		config = {};
	}
	if (config instanceof Stage) {
		config = {
			stage: config
		};
	}
	if (config.stage instanceof Stage) {
		self.stage = config.stage;
	} else {
		if (config.stage instanceof Function) {
			self.stage = new Stage(config.stage);
		} else {
			self.stage = new Stage();
		}
	}

	self.split = config.split instanceof Function ? config.split : function(ctx) {
		return [ctx];
	};
	self.exHandler = config.exHandler instanceof Function ? config.exHandler : function(err, ctx, index) {
		return err;
	};
	self.combine = config.combine instanceof Function ? config.combine : null;
	self.name = config.name;
}

util.inherits(Parallel, Stage);

exports.Parallel = Parallel;
var StageProto = Parallel.super_.prototype;
var ParallelProto = Parallel.prototype;

ParallelProto.stage = undefined;
ParallelProto.split = undefined;
ParallelProto.exHandler = undefined;
ParallelProto.combine = undefined;

ParallelProto.reportName = function() {
	var self = this;
	return "PLL:" + self.name;
};

ParallelProto.compile = function() {
	var self = this;
	if (!self.name) {
		self.name = self.stage.reportName();
	}
	var run = function(err, ctx, done) {
		var iter = 0;
		var childs = self.split(ctx);
		var len = childs ? childs.length : 0;
		var errors = [];
		var next = function(index) {
			function finish() {
				if (errors.length > 0) {
					done(errors);
				} else {
					if (!err && self.combine) {
						self.combine(ctx, childs);
					} {
						done();
					}
				}
			}

			function logError(err, ctx) {
				errors.push({
					stage: self.name,
					index: index,
					err: err,
					stack: err.stack,
					ctx: childs[index]
				});
			}
			// NEED CUSTOM ERROR LOGGER !!!
			return function(err, retCtx) {
				iter++;
				if (iter > 0) {
					childs[index] = retCtx;
				}
				if (self.exHandler(err, ctx, index)) {
					logError(err, ctx);
				}
				if (iter == len) {
					finish();
				}
			};
		};
		var cldCtx;
		for (var i = 0; i < len; i++) {
			cldCtx = childs[i];
			self.stage.execute(ctx.ensureIsChild(childs[i]), next(i));
		}

		if (len === 0) {
			done();
		}
	};
	self.run = run;
};

ParallelProto.execute = function(context, callback) {
	var self = this;
	if (!self.run) {
		self.compile();
	}
	StageProto.execute.apply(self, arguments);
};