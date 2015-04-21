/*! 
 * Module dependency
 */
var Stage = require('./stage').Stage;
var util = require('./util').Util;
var ErrorList = require('./util').ErrorList;
var Empty = require('./empty').Empty;

/**
 * Process staging in parallel way
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
 * 		`split` does not require `combine` it will return parent context;
 * 		in cases that have no declaration for `split` configured or default will be used
 *
 * @param {Object} config configuration object
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
util.inherits(Parallel, Stage);

/**
 * internal declaration fo `success`
 */
Parallel.prototype.stage = undefined;

/**
 * internal declaration fo `success`
 */
// Parallel.prototype.split = function(ctx) {
// 	return [ctx];
// };

/**
 * internal declaration fo `combine`
 * @param {Context} ctx main context
 * @param {Context[]} children  list of all children contexts
 */
// Parallel.prototype.combine = function(ctx, children) {};

/**
 * override of `reportName`
 * @api public
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
	var hasCombine = !!self.combine;
	var run = function(err, ctx, done) {
		var iter = 0;
		var children = self.split ? self.split(ctx) : [ctx];
		var len = children ? children.length : 0;
		var errors;
		var hasError = false;
		var combined = hasCombine;

		var next = function(index) {
			return function(err, retCtx) {
				if (!err) {
					children[index] = retCtx;
				} else {
					if (!hasError) {
						hasError = true;
						errors = [];
					}
					errors.push({
						stage: self.name,
						index: index,
						err: err,
						stack: err.stack,
						ctx: children[index]
					});
				}

				if (++iter >= len) {
					if (!hasError) {
						if (combined) {
							self.combine(ctx, children);
						}
						return done();
					} else {
						return done(new ErrorList(errors));
					}
				}
			};
		};

		if (len === 0) {
			return done(err);
		} else {
			for (var i = 0; i < len; i++) {
				self.stage.execute(err, children[i], next(i));
			}
		}
	};
	self.run = run;
	Parallel.super_.prototype.compile.call(self);
};

/**
 * override of execute
 * @param {Context} context evaluating context
 * @param {Context} [callback] returning callback
 * @api public
 */
Parallel.prototype.execute = function(err, context, callback) {
	if (context instanceof Function) {
		callback = context;
		context = err;
		err = undefined;
	} else if (!context && !(err instanceof Error)) {
		context = err;
		err = undefined;
		callback = undefined;
	}
	var self = this;
	if (!self.run) {
		self.compile();
	}
	Parallel.super_.prototype.execute.call(self, err, context, callback);
};

/*!
 * toString
 */
Parallel.prototype.toString = function() {
	return "[pipeline Parallel]";
};

/*!
 * toString
 */
Parallel.prototype.toString = function () {
    return "[pipeline Parallel]";
};

/*!
 * exports
 */
exports.Parallel = Parallel;