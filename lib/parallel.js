/*! 
 * Module dependency
 */
var Stage = require('./stage').Stage;
var Context = require('./context').Context;
var util = require('./util').Util;

/**
 * Each time split context for current step and use it in current stage
 * ### config as _Object_
 *
 * - `stage` evaluating stage
 *
 * - `split`
 *  function that split existing stage into smalls parts, it needed
 *
 * - `combine`
 *  if any result combining is need, this can be used to combine splited parts and update context
 *
 * !!!Note!!!Split does not require combine --- b/c it will return parent context;
 * if cases have no declaration for `split` configured or default will be used
 *
 * @param config Object configuration object
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

	self.name = config.name;
}

/*!
 * Inherited from Stage
 */
util.inherits(Parallel, Stage);

/**
 * internal declaration fo `success`
 */
Parallel.prototype.stage = undefined;

/**
 * internal declaration fo `success`
 */
Parallel.prototype.split = function(ctx) {
	return [ctx];
};

/**
 * internal declaration fo `combine`
 * @param ctx Context main context
 * @param retCtx Context[] list of all children contexts
  */
Parallel.prototype.combine = function(ctx, retCtx) {
	return ctx;
};

/**
 * override of `reportName`
 * @api protected
 */
Parallel.prototype.reportName = function() {
	var self = this;
	return "PLL:" + self.name;
};

/**
 * override of compile
 * split all and run all
 * @api protected
 */
Parallel.prototype.compile = function() {
	var self = this;
	if (!self.name) {
		self.name = self.stage.reportName();
	}
	var run = function(err, ctx, done) {
		var iter = 0;
		var children = self.split(ctx);
		var len = children ? children.length : 0;
		var errors = [];
		var next = function(index) {
			function finish() {
				if (errors.length > 0) {
					done(errors);
				} else {
					if (self.combine) {
						self.combine(ctx, children);
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
					ctx: children[index]
				});
			}

			return function(err, retCtx) {
				iter++;
				if (iter > 0) {
					children[index] = retCtx;
				}
				if (err) {
					logError(err, ctx);
				}
				if (iter == len) {
					finish();
				}
			};
		};
		var cldCtx;
		for (var i = 0; i < len; i++) {
			cldCtx = children[i];
			self.stage.execute(ctx.ensureIsChild(children[i]), next(i));
		}

		if (len === 0) {
			done();
		}
	};
	self.run = run;
};

/**
 * override of execute
 * @api protected
 */
Parallel.prototype.execute = function(context, callback) {
	var self = this;
	if (!self.run) {
		self.compile();
	}
	Parallel.super_.prototype.execute.apply(self, arguments);
};

/*!
 * exports
 */
exports.Parallel = Parallel;