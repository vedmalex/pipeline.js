var Stage = require('./stage').Stage;
var util = require('util');

function Pipeline(config) {
	this.stages = [];
	if(config) {
		if(config instanceof Array) {
			Stage.call(this);
			var len = config.length;
			for(var i = 0; i < len; i++) {
				this.addStage(config[i]);
			}
		}
		if(typeof(config) === 'object') {
			delete config.run;
			Stage.call(this, config);
		} else if(typeof(config) === 'function') Stage.call(this);
	} else Stage.call(this);
}
util.inherits(Pipeline, Stage);
exports.Pipeline = Pipeline;
// pushs Stage to specific list if any
// _list is optional
var PipelineProto = Pipeline.prototype;
var StageProto = Pipeline.super_.prototype;

PipelineProto.addStage = function(stage, _list) {
	var list = _list;
	if(typeof(list) == 'string') {
		if(!this[list]) this[list] = [];
		list = this[list];
	}
	if(!list) list = this.stages;
	if(!(stage instanceof Stage)){
		if(typeof(stage) === 'function') stage = new Stage(stage);
		if(typeof(stage) === 'object') stage = new Stage(stage);
	}

	list.push(stage);
	this.run = 0; //reset run method
};

// сформировать окончательную последовательность stages исходя из имеющихся списков
// приоритет списка.
// список который будет использоваться в случае ошибки.
PipelineProto.compile = function() {
	var self = this;
	var len = self.stages.length;
	var run = function(err, context, done) {
			var i = -1;
			var stlen = len; // hack to avoid upper context search;
			var stList = self.stages; // the same hack
			//sequential run;
			var next = function(err, context) {
					if(++i == stlen || err) {
						done(err);
					} else {
						stList[i].execute(context, next);
					}
				};
			next(err, context);
		};

	if(len > 0) {
		self.run = run;
	} else throw new Error('ANY STAGE FOUND');
};

PipelineProto.execute = function(context, callback) {
	var self = this;
	if(!self.run) self.compile();
	StageProto.execute.apply(this, arguments);
};