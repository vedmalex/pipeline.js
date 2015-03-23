/*! 
 * Module dependency
 */
var Stage = require('./stage').Stage;
var util = require('./util').Util;
var Empty = require('./empty').Empty;

/**
 * it make possible to choose which stage to run according to result of `condition` evaluation
 * ### config as _Object_
 *
 * - `condition`
 * desicion function or boolean condition
 * used to decide what way to go.
 *
 * - `success`
 * `Stage` or stage `function` to run in case of _successful_ evaluation of `condition`
 *
 * - `failed`
 * `Stage` or stage `function` to run in case of _failure_ evaluation of `condition`
 *
 * other confguration as Stage because it is its child Class.
 *
 * @param {Object} config configuration object
 */
function IfElse(config) {

	var self = this;

	if (!(self instanceof IfElse)) {
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

	if (config.condition instanceof Function) {
		self.condition = config.condition;
	}

	if (config.success instanceof Stage) {
		self.success = config.success;
	} else {
		if (config.success instanceof Function) {
			self.success = new Stage(config.success);
		} else {
			self.success = new Empty();
		}
	}

	if (config.failed instanceof Stage) {
		self.failed = config.failed;
	} else {
		if (config.failed instanceof Function) {
			self.failed = new Stage(config.failed);
		} else {
			self.failed = new Empty();
		}
	}

	self.name = config.name;
}

/*!
 * Inherited from Stage
 */
util.inherits(IfElse, Stage);

/**
 * internal declaration fo `success`
 */
IfElse.prototype.success = undefined;

/**
 * internal declaration fo `failure`
 */
IfElse.prototype.failure = undefined;

/**
 * internal declaration fo `condition`
 */
IfElse.prototype.condition = function(ctx) {
	return true;
};

/**
 * override of `reportName`
 * @api protected
 */
IfElse.prototype.reportName = function() {
	var self = this;
	return "IFELSE:" + self.name;
};

/**
 * override of `compile`
 * @api protected
 */
IfElse.prototype.compile = function() {
	var self = this;
	if (!self.name) {
		self.name = "success: " + self.success.reportName() + " failure: " + self.failed.reportName();
	}
	var run = function(ctx, done) {
		if (self.condition(ctx)) {
			self.success.execute(ctx, done);
		} else {
			self.failed.execute(ctx, done);
		}
	};
	self.run = run;
};

/**
 * override of execute
 * @param {Context} context evaluating context
 * @param {Context} [callback] returning callback
 * @api public
 */
IfElse.prototype.execute = function(context, callback) {
	var self = this;
	if (!self.run) {
		self.compile();
	}
	IfElse.super_.prototype.execute.apply(self, arguments);
};

/*!
 * exports
 */
exports.IfElse = IfElse;