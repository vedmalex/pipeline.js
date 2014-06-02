var Stage = require('./stage').Stage;
var util = require('./util.js').Util;

function IfElse(config) {
	var self = this;
	if (!(self instanceof IfElse)) {
		throw new Error('constructor is not a function');
	}
	Stage.apply(self);
	if (!config) {
		config = {};
	}
	self.condition = config.condition instanceof Function ? config.condition : function(ctx) {
		return true;
	};

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

exports.IfElse = IfElse;
var StageProto = IfElse.super_.prototype;
var IfElseProto = IfElse.prototype;

IfElseProto.condition = undefined;
IfElseProto.success = undefined;
IfElseProto.failure = undefined;

IfElseProto.reportName = function() {
	var self = this;
	return "IFELSE:" + self.name;
};

IfElseProto.compile = function() {
	var self = this;
	if (!self.name) {
		self.name = "success: " + self.success.reportName() + " failure: " + self.failed.reportName();
	}
	var run = function(err, ctx, done) {
		if (self.condition(ctx)) {
			self.success.execute(ctx, done);
		} else {
			self.failed.execute(ctx, done);
		}
	};
	self.run = run;
};

IfElseProto.execute = function(context, callback) {
	var self = this;
	if (!self.run) {
		self.compile();
	}
	StageProto.execute.apply(self, arguments);
};