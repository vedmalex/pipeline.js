/*!
 * Module dependency
 */
var Stage = require('./stage').Stage;
var util = require('./util').Util;
var Empty = require('./empty').Empty;

/**
 * Timeout: run **stage** and wait **timeout** ms for and run overdue stage
 * configuration
 *  - timeout
 * 		timeout in ms
 * 	- stage
 * 		main stage
 * 	- overdue
 * 		overdue stage optional. if no overdue is configured.
 * @param {Object} config configuration object
 */
function Timeout(config) {

	var self = this;

	if (!(self instanceof Timeout)) {
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

	self.timeout = config.timeout || 1000;

	if (config.stage instanceof Stage) {
		self.stage = config.stage;
	} else if (config.stage instanceof Function) {
		self.stage = new Stage(config.stage);
	} else {
		self.stage = new Empty();
	}

	if (config.overdue instanceof Stage) {
		self.overdue = config.overdue;
	} else if (config.overdue instanceof Function) {
		self.overdue = config.overdue;
	}

	self.overdue = new Stage(self.overdue);
	self.name = config.name;
}

/*!
 * Inherited from Stage
 */
util.inherits(Timeout, Stage);

/**
 * internal declaration fo `timeout`
 */
Timeout.prototype.timeout = undefined;

/**
 * internal declaration fo `stage`
 */
Timeout.prototype.stage = undefined;

/**
 * default implementation of overdue;
 */
Timeout.prototype.overdue = function(ctx, done) {
	done(new Error('overdue'));
};

/**
 * override of `reportName`
 * @api protected
 */
Timeout.prototype.reportName = function() {
	return "Timeout:" + this.name;
};

/**
 * override of compile
 * @api protected
 */
Timeout.prototype.compile = function() {
	var self = this;

	if (!self.name) {
		self.name = "success: " + self.stage.reportName() + " failure: " + self.overdue.reportName();
	}

	var run = function(err, ctx, done) {
		var to;
		var localDone = function(err) {
			if (to) {
				clearTimeout(to);
				to = null;
				return done(err);
			}
		};
		var waitFor;

		if (self.timeout instanceof Function) {
			waitFor = self.timeout(ctx);
		} else {
			waitFor = self.timeout;
		}

		to = setTimeout(function() {
			if (to) {
				self.overdue.execute(err, ctx, localDone);
			}
			/* else {
				here can be some sort of caching operation 
			}*/
		}, waitFor);
		self.stage.execute(err, ctx, localDone);
	};
	self.run = run;
	Timeout.super_.prototype.compile.call(self);
};

/**
 * override of execute
 * @api protected
 */
Timeout.prototype.execute = function(err, context, callback) {
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
	Timeout.super_.prototype.execute.call(self, err, context, callback);
};

/*!
 * toString
 */
Timeout.prototype.toString = function() {
	return "[pipeline Timeout]";
};

/*!
 * exports
 */
exports.Timeout = Timeout;