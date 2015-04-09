/*! 
 * Module dependency
 */

var Stage = require('./stage').Stage;
var Context = require('./context').Context;
var util = require('./util').Util;
var Empty = require('./empty').Empty;

/**
 * Each time split context for current step and use it in current stage
 * it is differs from sequential and parallel because it is not combining, stage and not limited to any number of iteration
 * ### config as _Object_
 *
 * - `stage`
 * 		evaluating stage
 *
 * - `split`
 * 		function that split existing stage into smalls parts, it needed
 *
 * @param {Object} confg configuration object
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
			self.stage = new Empty();
		}
	}

	if (config.split instanceof Function) {
		self.split = config.split;
	}

	if (config.reachEnd instanceof Function) {
		self.reachEnd = config.reachEnd;
	}

	self.name = config.name;
}

/*!
 * Inherited from Stage
 */
util.inherits(DoWhile, Stage);

/**
 * internal declaration fo `stage`
 */
DoWhile.prototype.stage = undefined;

/**
 * internal declaration fo `split`
 */
DoWhile.prototype.split = function(ctx, iter) {
	return ctx;
};

/**
 * internal declaration fo `reachEnd`
 */
DoWhile.prototype.reachEnd = function(err, ctx, iter) {
	return true;
};

/**
 * override of `reportName`
 * @api protected
 */
DoWhile.prototype.reportName = function() {
	var self = this;
	return "WHI:" + self.name;
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
		var next = function(err, retCtx) {
			iter++;
			if (self.reachEnd(err, ctx, iter)) {
				return done(err);
			} else {
				self.stage.execute(err, self.split(ctx, iter), next);
			}
		};
		next(err);
	};
	self.run = run;
};

/**
 * override of execute
 * @param {Context} context evaluating context
 * @param {Context} [callback] returning callback
 * @api public
 */
DoWhile.prototype.execute = function(err, context, callback) {
	if(context instanceof Function){
		callback = context;
		context = err;
		err = undefined;
	}
	var self = this;
	if (!self.run) {
		self.compile();
	}
	DoWhile.super_.prototype.execute.apply(self, arguments);
};

/*!
 * toString
 */
DoWhile.prototype.toString = function() {
	return "[pipeline DoWhile]";
};

/*!
 * exports
 */
exports.DoWhile = DoWhile;