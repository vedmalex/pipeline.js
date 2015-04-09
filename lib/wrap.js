/*!
 * Module dependency
 */
var Context = require('./context').Context;
var Stage = require('./stage').Stage;
var util = require('./util').Util;
var Empty = require('./empty').Empty;

/**
 * Wrap stage
 * configuration:
 * 	- prepare
 * 		used to prepera new context that fits wrapped stage
 * 	- finalize
 *		used to write fill main context with result
 *
 * @param {Object} config configuration object
 */
function Wrap(config) {

	var self = this;

	if (!(self instanceof Wrap)) {
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

		if (config.prepare instanceof Function) {
			self.prepare = config.prepare;
		}

		if (config.finalize instanceof Function) {
			self.finalize = config.finalize;
		}
	}
}

/*!
 * Inherited from Stage
 */
util.inherits(Wrap, Stage);

/**
 * default prepare implementation
 * @param {Context} ctx
 * @return {Context}
 */
Wrap.prototype.prepare = function(ctx) {
	return ctx;
};

/**
 * default finalize implementation
 * @param {Context} ctx
 * @param {Context}
 */
Wrap.prototype.finalize = function(ctx, retCtx) {
	// by default the main context will be used to return;
	// so we do nothing here
};

/**
 * override of `reportName`
 * @api protected
 */
Wrap.prototype.reportName = function() {
	return "Wrap:" + this.name;
};

/**
 * override of compile
 * @api protected
 */
Wrap.prototype.compile = function() {
	var self = this;

	if (!self.name) {
		self.name = "success: " + self.stage.reportName() + " failure: " + self.overdue.reportName();
	}

	var run = function(err, ctx, done) {
		self.stage.execute(err, ctx, done);
	};

	self.run = run;
};

/**
 * override of execute
 * @api protected
 */
Wrap.prototype.execute = function(err, _context, callback) {
	if (_context instanceof Function) {
		callback = _context;
		_context = err;
		err = undefined;
	} else if(!_context && !(err instanceof Error)){
		_context = err;
		err = undefined;
		callback = undefined;
	}
	var self = this;

	_context = Context.ensure(_context);
	var context = self.prepare(_context);

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

	Wrap.super_.prototype.execute.call(self, err, context, cb);
};

/*!
 * toString
 */
Wrap.prototype.toString = function() {
	return "[pipeline Wrap]";
};

/*!
 * exports
 */
exports.Wrap = Wrap;