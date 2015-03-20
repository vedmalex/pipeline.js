/*!
 * Module dependency
 */
var Stage = require('./stage').Stage;
var util = require('./util').Util;
var Empty = require('./empty').Empty;

/**
 * Timeout: run **stage** and wait **timeout** ms for and run overdue stage
 * configuration
 *  - timeout --- timeout in ms
 * 	- stage --- main stage
 * 	- overdue --- overdue stage optional. if no overdue is configured.
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
		process.nextTick(function() {
			var to;
			var localDone = function(err) {

				if (to) {
					clearTimeout(to);
					to = null;
					done(err);
				}
			};

			if (!err) {
				to = setTimeout(function() {
					if (to) {
						self.overdue.execute(ctx, localDone);
					}
				}, self.timeout);
				self.stage.execute(ctx, localDone);
			} else {
				done(err);
			}
		});
	};
	self.run = run;
};

/**
 * override of execute
 * @api protected
 */
Timeout.prototype.execute = function(context, callback) {
	var self = this;
	if (!self.run) {
		self.compile();
	}
	Timeout.super_.prototype.execute.apply(self, arguments);
};

/*!
 * exports
 */
exports.Timeout = Timeout;