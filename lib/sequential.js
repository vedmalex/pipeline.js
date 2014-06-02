var Stage = require('./stage').Stage;
var Context = require('./context').Context;
var util = require('./util.js').Util;

function Sequential(config) {
	var self = this;
	if (!(self instanceof Sequential)) {
		throw new Error('constructor is not a function');
	}
	
	Stage.apply(self);
	if (!config) {
		config = {};
	}
	if (config instanceof Stage) {
		config = {
			stage: config
		};
	}
	/*stage, split, reachEnd, combine*/
	if (config.stage instanceof Stage) {
		self.stage = config.stage;
	} else {
		if (config.stage instanceof Function) {
			self.stage = new Stage(config.stage);
		} else {
			self.stage = new Stage();
		}
	}
	self.prepareContext = config.prepareContext instanceof Function ? config.prepareContext : function(ctx) {
		return ctx;
	};
	self.split = config.split instanceof Function ? config.split : function(ctx, iter) {
		return ctx;
	};
	self.reachEnd = config.reachEnd instanceof Function ? config.reachEnd : function(err, ctx, iter) {
		return true;
	};
	self.combine = config.combine instanceof Function ? config.combine : null;
	self.checkContext = config.checkContext instanceof Function ? config.checkContext : function(err, ctx, iter, callback) {
		callback(err, ctx);
	};
	self.name = config.name;
}

util.inherits(Sequential, Stage);

exports.Sequential = Sequential;
var StageProto = Sequential.super_.prototype;
var SequentialProto = Sequential.prototype;

SequentialProto.stage = undefined;
SequentialProto.prepareContext = undefined;
SequentialProto.split = undefined;
SequentialProto.reachEnd = undefined;
SequentialProto.combine = undefined;
SequentialProto.checkContext = undefined;

SequentialProto.reportName = function() {
	var self = this;
	return "SEQ:" + self.name;
};

SequentialProto.compile = function() {
	var self = this;
	if (!self.name) {
		self.name = self.stage.reportName();
	}
	var run = function(err, ctx, done) {
		var iter = -1;
		var childsCtx = [];
		var combine = function(err) {
			if (!err && self.combine) {
				self.combine(innerCtx, ctx, childsCtx);
			}
			done(err);
		};
		var innerCtx = ctx.ensureIsChild(self.prepareContext(ctx));
		var next = function(err, retCtx) {
			iter++;
			if (iter > 0) {
				childsCtx.push(retCtx);
			}
			self.checkContext(err, innerCtx, iter, function(err, innerCtx) {
				if (self.reachEnd(err, innerCtx, iter)) {
					combine(err, iter);
				} else {
					self.stage.execute(innerCtx.ensureIsChild(self.split(innerCtx, iter)), next);
				}
			});
		};
		next();
	};
	self.run = run;
};

SequentialProto.execute = function(context, callback) {
	var self = this;
	if (!self.run) {
		self.compile();
	}
	StageProto.execute.apply(self, arguments);
};