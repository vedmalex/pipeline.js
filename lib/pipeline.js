/*!
 * Module dependency
 */
var Stage = require('./stage').Stage;
var util = require('./util.js').Util;

/**
 * it make possible to choose which stage to run according to result of `condition` evaluation
 *  - config as 
 		- `Function` --- first Stage for pipeline
 * 		- `Stage` --- first Stage 
 * 		- `Array` --- list of stages
 * 		- `Object` --- config for Pipeline
 *			  - `stages` list of stages
 *			  - `name` name of pipeline
 * 		- `Empty` --- empty pipeline
 *
 * @param {Object} config configuration object
 */
function Pipeline(config) {

	var self = this;

	if (!(self instanceof Pipeline)) {
		throw new Error('constructor is not a function');
	}

	self.stages = [];
	var stages = [];

	if (config) {

		if (config.run instanceof Function) {
			config.stage = new Stage(config.run);
			delete config.run;
		}

		if (Array.isArray(config.stages)) {
			stages.push.apply(stages, config.stages);
			delete config.stages;
		}

		if (config instanceof Array) {
			stages.push.apply(stages, config);
		}

		if (typeof(config.run) === 'function') {
			stages.push(config.run);
			var stg = config.run;
			delete config.run;
		}

		if (typeof(config) instanceof Stage) {
			stages.push(config);
		}

		if (typeof(config) === 'object') {
			Stage.call(self, config);
		}
		if (typeof(config) === 'string') {
			Stage.call(self);
			self.name = config;
		}

	} else {
		Stage.call(self);
	}

	if (config && config.name) {
		self.name = config.name;
	}

	if (!self.name) {
		self.name = [];
	}

	var len = stages.length;
	for (var i = 0; i < len; i++) {
		self.addStage(stages[i]);
	}
}

/*!
 * Inherited from Stage
 */
util.inherits(Pipeline, Stage);

/**
 * internal declaration for stage store
 */
Pipeline.prototype.stages = undefined;

/**
 * override of `reportName`
 * @api public
 */
Pipeline.prototype.reportName = function() {
	var self = this;
	return "PIPE:" + self.name;
};

/**
 * add Stages to Pipeline
 * it reset run method to compile it again
 * @api public
 * @param {Stage} stage new stage to evaluate in pipeline
 */
Pipeline.prototype.addStage = function(stage) {
	var self = this;
	var empty = false;
	if (!(stage instanceof Stage)) {
		if (typeof(stage) === 'function') {
			stage = new Stage(stage);
		} else {
			if (typeof(stage) === 'object') {
				stage = new Stage(stage);
			} else {
				empty = true;
			}
		}
	}
	if (!empty) {
		self.stages.push(stage);
		if (self.run) {
			//reset run method
			self.run = 0;
		}
	}
};

/**
 * override of compile
 * run different stages one after another one
 * @api protected
 */
Pipeline.prototype.compile = function() {
	var self = this;
	var len = self.stages.length;
	var nameUndefined = (Array.isArray(self.name) || !self.name);
	if (nameUndefined) {
		self.name = self.stages.map(function(st) {
			return st.reportName();
		}).join('->');
	}

	var run = function(context, done) {
		var i = -1;
		var stlen = len; // hack to avoid upper context search;
		var stList = self.stages; // the same hack
		//sequential run;
		var next = function(err, context) {
			if (!err && i > stlen) err = new Error(' the method \'done\' of pipeline is called more that ones');
			if (++i >= stlen || err) return done(err);
			else stList[i].execute(context, next);
		};
		next(null, context);
	};

	if (len > 0) {
		self.run = run;
	} else {
		self.run = function() {};
	}
};

/**
 * override of execute
 * @param {Context} context evaluating context
 * @param {Context} [callback] returning callback
 * @api public
 */
Pipeline.prototype.execute = function(context, callback) {
	var self = this;
	if (!self.run) {
		self.compile();
	}
	Pipeline.super_.prototype.execute.apply(self, arguments);
};

/*!
 * toString
 */
Pipeline.prototype.toString = function() {
	return "[pipeline Pipeline]";
};

/*!
 * exports
 */
exports.Pipeline = Pipeline;