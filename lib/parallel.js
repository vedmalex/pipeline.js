var Stage = require('./stage').Stage;
var Context = require('./context').Context;
var util = require('./util').Util;
/*
	Split does not require combine --- b/c in will return parent context; 
*/
function Parallel(config) {

	var self = this;

	if (!(self instanceof Parallel)) {
		throw new Error('constructor is not a function');
	}

	if (config && config.run instanceof Function) {
		config.stage = new Stage(config.run);
		delete config.run;
	}

	Stage.apply(self, arguments);

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

	if (config.split instanceof Function) {
		self.split = config.split;
	}

	if (config.combine instanceof Function) {
		self.combine = config.combine;
	}

	if (config.exHandler instanceof Function) {
		self.exHandler = config.exHandler;
	}

	self.name = config.name;
}

util.inherits(Parallel, Stage);

Parallel.prototype.stage = undefined;
Parallel.prototype.exHandler = function(err, ctx, index) {
	return err;
};
Parallel.prototype.split = function(ctx) {
	return [ctx];
};
Parallel.prototype.combine = function(ctx, retCtx) {
	return ctx;
};

Parallel.prototype.reportName = function() {
	var self = this;
	return "PLL:" + self.name;
};

Parallel.prototype.compile = function() {
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
					}
					done();
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

Parallel.prototype.execute = function(context, callback) {
	var self = this;
	if (!self.run) {
		self.compile();
	}
	Parallel.super_.prototype.execute.apply(self, arguments);
};

exports.Parallel = Parallel;