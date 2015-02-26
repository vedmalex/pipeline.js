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
function DoWhile(config) {

	var self = this;

	if (!(self instanceof DoWhile)) {
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

	if (config.split instanceof Function) {
		self.split = config.split;
	}

	if (config.reachEnd instanceof Function) {
		self.reachEnd = config.reachEnd;
	}

	if (config.combine instanceof Function) {
		self.combine = config.combine;
	}

	self.name = config.name;
}

/*!
 * Inherited from Stage
 */
util.inherits(DoWhile, Stage);

/**
 * internal declaration fo `success`
 */
DoWhile.prototype.stage = undefined;

/**
 * internal declaration fo `success`
 */
DoWhile.prototype.split = function(ctx, iter) {
	return ctx;
};

/**
 * internal declaration fo `success`
 */
DoWhile.prototype.reachEnd = function(err, ctx, iter) {
	return true;
};

/**
 * internal declaration fo `success`
 */
DoWhile.prototype.combine = function(ctx, childrenCtxList) {};

/**
 * override of `reportName`
 * @api protected
 */
DoWhile.prototype.reportName = function() {
	var self = this;
	return "SEQ:" + self.name;
};

/**
 * override of compile
 * split context one by one and run each after another
 * @api protected
 */
DoWhile.prototype.compile = function() {
	var self = this;
	if (!self.name) {
		self.name = self.stage.reportName();
	}
	var run = function(err, ctx, done) {
		var iter = -1;
		var childrenCtxList = [];
		var combine = function(err) {
			if (!err && self.combine) {
				self.combine(ctx, childrenCtxList);
			}
			done(err);
		};
		var next = function(err, retCtx) {
			iter++;
			if (iter > 0) {
				childrenCtxList.push(retCtx);
			}
			if (self.reachEnd(err, ctx, iter)) {
				combine(err);
			} else {
				self.stage.execute(ctx.ensureIsChild(self.split(ctx, iter)), next);
			}
		};
		next();
	};
	self.run = run;
};

/**
 * override of execute
 * @api protected
 */
DoWhile.prototype.execute = function(context, callback) {
	var self = this;
	if (!self.run) {
		self.compile();
	}
	DoWhile.super_.prototype.execute.apply(self, arguments);
};

/*!
 * exports
 */
exports.DoWhile = DoWhile;
