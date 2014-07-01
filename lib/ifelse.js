var Stage = require('./stage').Stage;
var util = require('./util').Util;

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
			self.success = new Stage();
		}
	}

	if (config.failed instanceof Stage) {
		self.failed = config.failed;
	} else {
		if (config.failed instanceof Function) {
			self.failed = new Stage(config.failed);
		} else {
			self.failed = new Stage();
		}
	}

	self.name = config.name;
}

util.inherits(IfElse, Stage);


IfElse.prototype.success = undefined;
IfElse.prototype.failure = undefined;

IfElse.prototype.condition = function(ctx) {
	return true;
};

IfElse.prototype.reportName = function() {
	var self = this;
	return "IFELSE:" + self.name;
};

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

IfElse.prototype.execute = function(context, callback) {
	var self = this;
	if (!self.run) {
		self.compile();
	}
	IfElse.super_.prototype.execute.apply(self, arguments);
};

exports.IfElse = IfElse;