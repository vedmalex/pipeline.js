var Stage = require('./stage').Stage;
var util = require('./util.js').Util;

function Pipeline(config) {
	if (!(this instanceof Pipeline)) throw new Error('constructor is not a function');
	this.stages = [];
	var stages = [];
	if (config) {
		if (Array.isArray(config.stages))
			stages.push.apply(stages, config.stages);
		
		if (config instanceof Array)
			stages.push.apply(stages, config);

		if (typeof(config.run) === 'function') {
			stages.push(config.run);
			var stg = config.run;
			delete config.run;
		}
		
		if (typeof(config) === 'function') {
			stages.push(config);
		}

		if (typeof(config) === 'object') {
			Stage.call(this, config);
		}
		if (typeof(config) === 'string') {
			Stage.call(this);
			this.name = config;
		}
	} else Stage.call(this);

	this.name = (config && config.name) ? config.name : this.name;
	if (!this.name) this.name = [];
	var len = stages.length;
	for (var i = 0; i < len; i++) {
		this.addStage(stages[i]);
	}
}

util.inherits(Pipeline, Stage);
exports.Pipeline = Pipeline;
// push Stage to specific list if any
var PipelineProto = Pipeline.prototype;
var StageProto = Pipeline.super_.prototype;

PipelineProto.reportName = function() {
	return "PIPE:" + this.name;
};

PipelineProto.addStage = function(stage) {
	if (!this.name) this.name = [];
	var empty = false;
	if (!(stage instanceof Stage)) {
		if (typeof(stage) === 'function') stage = new Stage(stage);
		else if (typeof(stage) === 'object') stage = new Stage(stage);
		else empty = true;
	}
	// if (empty) {
	this.stages.push(stage);
	this.run = 0; //reset run method
	// }
};

// сформировать окончательную последовательность stages исходя из имеющихся списков
// приоритет списка.
// список который будет использоваться в случае ошибки.
PipelineProto.compile = function() {
	var self = this;
	var len = self.stages.length;
	var nameUndefined = (Array.isArray(self.name) || !self.name);
	if (nameUndefined) {
		self.name = self.stages.map(function(st) {
			return st.reportName()
		}).join('->');
	}
	var run = function(err, context, done) {
		var i = -1;
		var stlen = len; // hack to avoid upper context search;
		var stList = self.stages; // the same hack
		//sequential run;
		var next = function(err, context) {
			if (++i == stlen || err) {
				done(err);
			} else {
				stList[i].execute(context, next);
			}
		};
		next(err, context);
	};

	if (len > 0) {
		self.run = run;
	} else throw new Error('ANY STAGE FOUND');
};

PipelineProto.execute = function(context, callback) {
	var self = this;
	if (!self.run) self.compile();
	StageProto.execute.apply(this, arguments);
};