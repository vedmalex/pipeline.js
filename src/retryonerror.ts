/*!
 * Module dependency
 */
var Stage = require('./stage').Stage;
var util = require('./util').Util;
var Empty = require('./empty').Empty;
var clone = require('./util.js').clone;

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
 * - `backup`
 *		make context backup
 * - `restore`
 * 		make context restore from backup
 *
 * @param {Object} config configuration object
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

	if(config.backup){
		this.backupContext = config.backup;
	}

	if(config.restore){
		this.restoreContext = config.restore;
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
	// return the clone context
	return clone(ctx);
};

/**
 * override of `reportName`
 * @param {Context} ctx main context
 * @param {Context} backup main context
 * @api public
 */
RetryOnError.prototype.restoreContext = function(ctx, backup) {
	// be default we will return backup;
	return backup;
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

	var run = function(err, ctx, done) {
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
				self.stage.execute(err, ctx, next);
			}
		};
		self.stage.execute(err, ctx, next);
	};

	self.run = run;
	RetryOnError.super_.prototype.compile.call(self);
};

/**
 * override of execute
 * @param {Context} context evaluating context
 * @param {Context} [callback] returning callback
 * @api public
 */
RetryOnError.prototype.execute = function(err, context, callback) {
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
	RetryOnError.super_.prototype.execute.call(self, err, context, callback);
};

/*!
 * toString
 */
RetryOnError.prototype.toString = function() {
	return "[pipeline RetryOnError]";
};

/*!
 * exports
 */
exports.RetryOnError = RetryOnError;