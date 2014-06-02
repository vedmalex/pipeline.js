var Stage = require('./stage').Stage;
var util = require('./util.js').Util;

function defSplit(ctx) {
	return ctx;
}

function defExHandler(err, ctx) {
	return err;
}

function defCombine(ctx, resCtx) {
	return resCtx;
}

function MultiWaySwitch(config) {
	var self = this;
	if (!(self instanceof MultiWaySwitch)) {
		throw new Error('constructor is not a function');
	}
	Stage.apply(self);

	if (!config) {
		config = {};
	}
	if (config instanceof Array) {
		config = {
			cases: config
		};
	}
	self.cases = config.cases ? config.cases : [];

	self.exHandler = config.exHandler instanceof Function ? config.exHandler : defExHandler;

	if (config.split && !config.combine) {
		throw new Error('custom split implies custom combine');
	}

	self.split = config.split instanceof Function ? config.split : defSplit;
	self.combine = config.combine instanceof Function ? config.combine : defCombine;

	self.name = config.name;
	if (!self.name) {
		self.name = [];
	}
}

util.inherits(MultiWaySwitch, Stage);

exports.MultiWaySwitch = MultiWaySwitch;
var StageProto = MultiWaySwitch.super_.prototype;
var MultiWaySwitchProto = MultiWaySwitch.prototype;

MultiWaySwitchProto.cases = undefined;
MultiWaySwitchProto.exHandler = undefined;
MultiWaySwitchProto.split = undefined;
MultiWaySwitchProto.combine = undefined;

MultiWaySwitchProto.reportName = function() {
	var self = this;
	return "MWS:" + self.name;
};

// каждый item может иметь свои split combine... смотреть.
MultiWaySwitchProto.compile = function() {
	var self = this;
	var i;

	var len = self.cases.length;
	var caseItem;
	var statics = [];
	var dynamics = [];
	var nameUndefined = (Array.isArray(self.name) || !self.name);
	if (nameUndefined) {
		self.name = [];
	}
	// Разделяем и назначаем каждому stage свое окружение: evaluate, split, combine
	for (i = 0; i < len; i++) {
		caseItem = self.cases[i];
		if (caseItem instanceof Stage) {
			caseItem = {
				stage: caseItem,
				evaluate: true
			};
		}

		if (caseItem.stage) {
			if (caseItem.stage instanceof Function) {
				caseItem.stage = new Stage(caseItem.stage);
			}
			if (!(caseItem.stage instanceof Stage) && (caseItem.stage instanceof Object)) {
				caseItem.stage = new Stage(caseItem.stage);
			}
			if (!(caseItem.split instanceof Function)) {
				caseItem.split = self.split;
			}
			if (!(caseItem.combine instanceof Function)) {
				caseItem.combine = self.combine;
			}
			if (!(caseItem.exHandler instanceof Function)) {
				caseItem.exHandler = self.exHandler;
			}
			if (typeof caseItem.evaluate === 'function') {
				dynamics.push(caseItem);
			} else {
				if (typeof caseItem.evaluate === 'boolean' && caseItem.evaluate) {
					statics.push(caseItem);
				}
			}
		}
		if (nameUndefined) {
			self.name.push(caseItem.stage.reportName());
		}
	}

	if (nameUndefined) self.name = self.name.join('|');

	var run = function(err, ctx, done) {
		var i;
		var len = dynamics.length;
		var actuals = [];
		actuals.push.apply(actuals, statics);

		for (i = 0; i < len; i++) {
			if (dynamics[i].evaluate(ctx)) {
				actuals.push(dynamics[i]);
			}
		}
		len = actuals.length;
		var iter = 0;

		var errors = [];
		var next = function(index) {
			function finish() {
				if (errors.length > 0) {
					done(errors);
				} else {
					done();
				}
			}

			function logError(err) {
				errors.push({
					index: index,
					err: err
				});
			}

			return function(err, retCtx) {
				iter++;
				var cur = actuals[index];
				if (cur.exHandler(err, ctx)) {
					logError(err);
				} else {
					cur.combine(ctx, retCtx);
				}
				if (iter == len) {
					finish();
				}
			};
		};
		var stg;
		for (i = 0; i < len; i++) {
			stg = actuals[i];
			stg.stage.execute(ctx.ensureIsChild(stg.split(ctx)), next(i));
		}

		if (len === 0) {
			done();
		}
	};
	self.run = run;
};

MultiWaySwitchProto.execute = function(context, callback) {
	var self = this;
	if (!self.run) {
		self.compile();
	}
	StageProto.execute.apply(self, arguments);
};