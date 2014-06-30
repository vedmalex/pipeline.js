var Stage = require('./stage').Stage;
var util = require('./util.js').Util;

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
		}

		if (config instanceof Array) {
			stages.push.apply(stages, config);
		}

		if (typeof(config.run) === 'function') {
			stages.push(config.run);
			var stg = config.run;
			delete config.run;
		}

		if (typeof(config) === 'function') {
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

util.inherits(Pipeline, Stage);
// push Stage to specific list if any

Pipeline.prototype.stages = undefined;

Pipeline.prototype.reportName = function() {
	var self = this;
	return "PIPE:" + self.name;
};

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

// сформировать окончательную последовательность stages исходя из имеющихся списков
// приоритет списка.
// список который будет использоваться в случае ошибки.
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
			if (++i >= stlen || err) {
				if (i > stlen) err = new Error(' the method \'done\' of pipeline is called more that ones');
				done(err);
			} else {
				stList[i].execute(context, next);
			}
		};
		next(err, context);
	};

	if (len > 0) {
		self.run = run;
	} else {
		self.run = function() {};
	}
};

Pipeline.prototype.execute = function(context, callback) {
	var self = this;
	if (!self.run) {
		self.compile();
	}
	Pipeline.super_.prototype.execute.apply(self, arguments);
};

exports.Pipeline = Pipeline;