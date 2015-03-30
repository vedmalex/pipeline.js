/*! 
 * Module dependency
 */

var Stage = require('./stage').Stage;
var util = require('./util').Util;
var ErrorList = require('./util').ErrorList;

/**
 * Each time split context for current step and use it in current stage
 * ### config as _Object_
 *
 * - `condition`
 * desicion function or boolean condition
 * used to decide what way to go.
 *
 * - `success`
 * `Stage` or stage `function` to run in case of _successful_ evaluation of `condition`
 *
 * - `failed`
 * `Stage` or stage `function` to run in case of _failure_ evaluation of `condition`
 *
 * other confguration as Stage because it is its child Class.
 *
 * if cases have no declaration for `split` configured or default will be used
 *
 * @param config Object configuration object
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

/*!
 * Inherited from Stage
 */
util.inherits(MultiWaySwitch, Stage);

/**
 * internal declaration fo store different `cases`
 * @api protected
 */
MultiWaySwitch.prototype.cases = undefined;

/**
 * default implementation fo `split` for `case`
 * @api protected
 * @param ctx Context soure context to be splitted
 */
MultiWaySwitch.prototype.split = undefined;

/**
 * default implementation fo `combine` for `case`
 * @api protected
 * @param ctx Context original contect
 * @param ctx Context case-stage resulting context
 */
MultiWaySwitch.prototype.combine = undefined;

/**
 * internal declaration fo `reportName`
 * @api protected
 */
MultiWaySwitch.prototype.reportName = function() {
	var self = this;
	return "MWS:" + self.name;
};

/**
 * overrides inherited `compile`
 * @api protected
 */
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

	// Apply to each stage own environment: evaluate, split, combine
	for (i = 0; i < len; i++) {
		caseItem = self.cases[i];

		if (caseItem instanceof Function) {
			caseItem = {
				stage: new Stage(caseItem),
				evaluate: true
			};
		}

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
			if (!caseItem.hasOwnProperty('evaluate')) {
				// by default is evaluate
				caseItem.evaluate = true;
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

	var run = function(ctx, done) {
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
			var hasError = false;

			return function(err, retCtx) {
				iter++;
				var cur = actuals[index];
				if (err) {
					if (!hasError) hasError = true;
					errors.push({
						index: index,
						err: err
					});
				}
				else cur.combine && cur.combine(ctx, retCtx);

				if (iter >= len)
					done(hasError ? new ErrorList(errors) : undefined);
			};
		};
		var stg;
		var lctx;
		for (i = 0; i < len; i++) {
			stg = actuals[i];
			lctx = stg.split ? ctx.ensureIsChild(stg.split(ctx)) : ctx;
			stg.stage.execute(lctx, next(i));
		}

		if (len === 0) {
			done();
		}
	};
	self.run = run;
};

/*!
 * toString
 */
MultiWaySwitch.prototype.toString = function() {
	return "[pipeline MultiWaySwitch]";
};

/**
 * override of execute
 * !!!Note!!! Errors that will be returned to callback will be stored in array
 * @param {Context} context evaluating context
 * @param {Context} [callback] returning callback
 * @api public
 */
MultiWaySwitch.prototype.execute = function(context, callback) {
	var self = this;
	if (!self.run) {
		self.compile();
	}
	MultiWaySwitch.super_.prototype.execute.apply(self, arguments);
};

/*!
 * exports
 */
exports.MultiWaySwitch = MultiWaySwitch;