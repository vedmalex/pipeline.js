/*!
 * Module dependency
 */
var Context = require('./context').Context;
var Stage = require('./stage').Stage;
var util = require('./util').Util;
var Empty = require('./empty').Empty;

/**
 * Retries to run, if error occures specified number of times
 * ### config as _Object_:
 *
 * - `stage` 
 *		evaluating stage
 * - `retry`
 * 		number that limits number of retries
 * - `retry` 
 * 		Function that decide either to run or to stop trying
 *
 * @param config Object configuration object
 */
function RetryOnError(config) {

	var self = this;

	if (!(self instanceof RetryOnError)) {
		throw new Error('constructor is not a function');
	}

	if (config && config.run instanceof Function) {
		config.stage = new Stage(config.run);
		delete config.run;
	}

	Stage.apply(self, arguments);

	if (config.stage instanceof Stage) {
		self.stage = config.stage;
	} else if (config.stage instanceof Function) {
		self.stage = new Stage(config.stage);
	} else {
		self.stage = new Empty();
	}

	if (config) {
		if (config.retry) {
			// function, count
			if (typeof config.retry !== 'function') {
				config.retry *= 1; // To get NaN is wrong type
			}
			if (config.retry)
				self.retry = config.retry;
		}
	} else {
		self.retry = 1;
	}
}

/*!
 * Inherited from Stage
 */
util.inherits(RetryOnError, Stage);

/**
 * internal declaration fo `combine`
 * @param {Error|Object|any} err error that is examined
 * @param {Context} ctx main context
 * @param {Number} iter current iteration: 0 is the run, but 1... retry couner
 */
RetryOnError.prototype.retry = function(err, ctx, iter) {
	// 0 means that run once 1 and more than one;
	return iter <= 1;
};

/**
 * override of `reportName`
 * @api public
 */
RetryOnError.prototype.reportName = function() {
	return "RetryOnError:" + this.name;
};

/**
 * override of `reportName`
 * @param {Context} ctx main context
 * @api public
 */
RetryOnError.prototype.backupContext = function(ctx) {
	return ctx.toObject();
};

/**
 * override of `reportName`
 * @param {Context} ctx main context
 * @param {Context} backup main context
 * @api public
 */
RetryOnError.prototype.restoreContext = function(ctx, backup) {
	ctx.overwrite(backup);
	// ctx.__errors.length = 0;
};

/**
 * override of compile
 * provide a way to compose retry run.
 * @api protected
 */
RetryOnError.prototype.compile = function() {

	var self = this;

	if (!self.name) {
		self.name = "stage: " + self.stage.reportName() + " with retry " + self.retry + " times";
	}

	var run = function(ctx, done) {
		// backup context object to overwrite if needed
		var backup = self.backupContext(ctx);

		reachEnd = function(err, iter) {
			if (err) {
				if (self.retry instanceof Function) {
					return !self.retry(err, ctx, iter);
				} else { // number
					return iter > self.retry;
				}
			} else {
				return true;
			}
		};
		var iter = -1;
		var next = function(err, ctx) {
			iter++;
			if (reachEnd(err, iter)) {
				return done(err);
			} else {
				// clean changes of existing before values.
				// may be will need to clear at all and rewrite ? i don't know yet.
				self.restoreContext(ctx, backup);
				self.stage.execute(ctx, next);
			}
		};
		self.stage.execute(ctx, next);
	};

	self.run = run;
};

/**
 * override of execute
 * @param {Context} context evaluating context
 * @param {Context} [callback] returning callback
 * @api public
 */
RetryOnError.prototype.execute = function(context, callback) {
	var self = this;
	if (!self.run) {
		self.compile();
	}
	RetryOnError.super_.prototype.execute.apply(self, arguments);
};

/*!
 * toString
 */
RetryOnError.prototype.toString = function () {
    return "[pipeline RetryOnError]";
};

/*!
 * exports
 */
exports.RetryOnError = RetryOnError;