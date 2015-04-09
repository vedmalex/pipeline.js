/*! 
 * Module dependency
 */
var Stage = require('./stage').Stage;
var Context = require('./context').Context;
var util = require('./util').Util;
var ErrorList = require('./util').ErrorList;
var Empty = require('./empty').Empty;

/**
 * Process staging in sequential way
 * ### config as _Object_
 *
 * - `stage`
 * 		evaluating stage
 * - `split`
 *		function that split existing stage into smalls parts, it needed
 * - `combine`
 * 		if any result combining is need, this can be used to combine splited parts and update context
 *
 * > **Note**
 *	Split does not require combine --- b/c it will return parent context;
 * 	in cases that have no declaration for `split` configured or default will be used
 *
 * @param config Object configuration object
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

	if (config.combine instanceof Function) {
		self.combine = config.combine;
	}

	self.name = config.name;
}

/*!
 * Inherited from Stage
 */
util.inherits(Sequential, Stage);

/**
 * internal declaration fo `stage`
 */
Sequential.prototype.stage = undefined;

/**
 * internal declaration fo `split`
 */
// Sequential.prototype.split = function(ctx) {
// 	return [ctx];
// };

/**
 * internal declaration fo `combine`
 * @param ctx Context main context
 * @param children Context[] list of all children contexts
 */
// Sequential.prototype.combine = function(ctx, children) {
// };

/**
 * override of `reportName`
 * @api protected
 */
Sequential.prototype.reportName = function() {
	var self = this;
	return "SEQ:" + self.name;
};

/**
 * override of compile
 * split all and run all
 * @api protected
 */
Sequential.prototype.compile = function() {
	var self = this;
	if (!self.name) {
		self.name = self.stage.reportName();
	}
	var hasCombine = !!self.combine;
	var run = function(err, ctx, done) {
		var iter = -1;
		var children = self.split ? self.split(ctx) : [ctx];
		var len = children ? children.length : 0;
		var combined = hasCombine;

		var next = function(err, retCtx) {
			if (err) {
				return done(new ErrorList({
					stage: self.name,
					index: iter,
					err: err,
					stack: err.stack,
					ctx: children[iter]
				}));
			}

			if (retCtx) {
				children[iter] = retCtx;
			}

			if (++iter >= len) {
				if (combined) {
					self.combine(ctx, children);
				}
				return done();

			} else {
				self.stage.execute(err, children[iter], next);
			}
		};

		if (len === 0) {
			return done(err);
		} else {
			next(err);
		}
	};
	self.run = run;
};

/**
 * override of execute
 * @api protected
 */
Sequential.prototype.execute = function(err, context, callback) {
	if (context instanceof Function) {
		callback = context;
		context = err;
		err = undefined;
	}
	var self = this;
	if (!self.run) {
		self.compile();
	}
	Sequential.super_.prototype.execute.apply(self, arguments);
};

/*!
 * toString
 */
Sequential.prototype.toString = function() {
	return "[pipeline Sequential]";
};

/*!
 * exports
 */
exports.Sequential = Sequential;