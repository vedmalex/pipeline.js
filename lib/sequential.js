var Stage = require('./stage').Stage;
var Context = require('./context').Context;
var util = require('./util').Util;
/**
 * each time split context for current step and use it in current stage
 * должен и комбинировать после первого этапа....
 */
function Sequential(config) {

	var self = this;

	if (!(self instanceof Sequential)) {
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

	/*stage, split, reachEnd, combine*/
	if (config.stage instanceof Stage) {
		self.stage = config.stage;
	} else {
		if (config.stage instanceof Function) {
			self.stage = new Stage(config.stage);
		} else {
			self.stage = new Stage();
		}
	}

	if (config.prepareContext instanceof Function) {
		self.prepareContext = config.prepareContext;
	}

	if (config.split instanceof Function) {
		self.split = config.split;
	}

	if (config.reachEnd instanceof Function) {
		self.reachEnd = config.reachEnd;
	}

	if (config.combine instanceof Function) {
		self.combine = config.combine;
	}

	if (config.checkContext instanceof Function) {
		self.checkContext = config.checkContext;
	}

	self.name = config.name;
}

util.inherits(Sequential, Stage);

Sequential.prototype.stage = undefined;

Sequential.prototype.split = function(ctx, iter) {
	return ctx;
};

Sequential.prototype.reachEnd = function(err, ctx, iter) {
	return true;
};

Sequential.prototype.combine = function(innerCtx, ctx, childsCtx) {};

Sequential.prototype.prepareContext = function(ctx) {
	return ctx;
};

Sequential.prototype.checkContext = function(err, ctx, iter, callback) {
	callback(err, ctx);
};

Sequential.prototype.reportName = function() {
	var self = this;
	return "SEQ:" + self.name;
};

Sequential.prototype.compile = function() {
	var self = this;
	if (!self.name) {
		self.name = self.stage.reportName();
	}
	var run = function(err, ctx, done) {
		var iter = -1;
		var childsCtx = [];
		var combine = function(err) {
			if (!err && self.combine) {
				self.combine(innerCtx, ctx, childsCtx);
			}
			done(err);
		};
		var innerCtx = ctx.ensureIsChild(self.prepareContext(ctx));
		var next = function(err, retCtx) {
			iter++;
			if (iter > 0) {
				childsCtx.push(retCtx);
			}
			self.checkContext(err, innerCtx, iter, function(err, innerCtx) {
				if (self.reachEnd(err, innerCtx, iter)) {
					combine(err, iter);
				} else {
					self.stage.execute(innerCtx.ensureIsChild(self.split(innerCtx, iter)), next);
				}
			});
		};
		next();
	};
	self.run = run;
};

Sequential.prototype.execute = function(context, callback) {
	var self = this;
	if (!self.run) {
		self.compile();
	}
	Sequential.super_.prototype.execute.apply(self, arguments);
};

exports.Sequential = Sequential;