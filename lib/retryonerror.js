var Context = require('./context').Context;
var Stage = require('./stage').Stage;
var util = require('./util').Util;

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
		self.stage = new Stage();
	}

	if (config) {

		if (config.prepare instanceof Function) {
			self.prepare = config.prepare;
		}

		if (config.finalize instanceof Function) {
			self.finalize = config.finalize;
		}
	}
}

util.inherits(RetryOnError, Stage);

RetryOnError.prototype = RetryOnError.prototype;

/**
 * default prepareContext implementation
 * @param {Context} ctx
 * @return {Context}
 */
RetryOnError.prototype.prepare = function(ctx) {
	return ctx;
};

RetryOnError.prototype.finalize = function(ctx, retCtx) {
	// by default the main context will be used to return;
	// so we do nothing here
};

RetryOnError.prototype.reportName = function() {
	return "RetryOnError:" + this.name;
};

RetryOnError.prototype.compile = function() {

	var self = this;

	if (!self.name) {
		self.name = "success: " + self.stage.reportName() + " failure: " + self.overdue.reportName();
	}

	var run = function(ctx, done) {
		self.stage.execute(ctx, done);
	};

	self.run = run;
};

RetryOnError.prototype.execute = function(_context, callback) {

	var self = this;

	_context = Context.ensure(_context);
	var context = self.prepare(_context);
	_context.ensureIsChild(context);

	if (!self.run) {
		self.compile();
	}

	var cb = function(err, context) {
		if (!err) {
			self.finalize(_context, context);
			callback(null, _context);
		} else {
			callback(err);
		}
	};

	RetryOnError.super_.prototype.execute.apply(self, [context, cb]);
};

exports.RetryOnError = RetryOnError;