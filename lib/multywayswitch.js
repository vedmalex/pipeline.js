var Stage = require('./stage').Stage;
var util = require('./util').Util;
/**
 * each time split context for current step and use it in current stage
 * должен и комбинировать после первого этапа....
 */

function MultiWaySwitch(config) {
	
	var self = this;
	
	if (!(self instanceof MultiWaySwitch)) {
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
	
	if (config instanceof Array) {
		config = {
			cases: config
		};
	}
	self.cases = config.cases ? config.cases : [];

	if (config.exHandler instanceof Function) {
		self.exHandler = config.exHandler;
	}

	if (config.split instanceof Function) {
		self.split = config.split;
	}
	
	if (config.combine instanceof Function) {
		self.combine = config.combine;
	}

	self.name = config.name;
	if (!self.name) {
		self.name = [];
	}
}

util.inherits(MultiWaySwitch, Stage);

MultiWaySwitch.prototype.cases = undefined;

MultiWaySwitch.prototype.exHandler = function(err, ctx) {
	return err;
};

MultiWaySwitch.prototype.split = function(ctx) {
	return ctx;
};

MultiWaySwitch.prototype.combine = function(ctx, resCtx) {
	return resCtx;
};

MultiWaySwitch.prototype.reportName = function() {
	var self = this;
	return "MWS:" + self.name;
};

// каждый item может иметь свои split combine... смотреть.
MultiWaySwitch.prototype.compile = function() {
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

MultiWaySwitch.prototype.execute = function(context, callback) {
	var self = this;
	if (!self.run) {
		self.compile();
	}
	MultiWaySwitch.super_.prototype.execute.apply(self, arguments);
};

exports.MultiWaySwitch = MultiWaySwitch;