var Stage = require('./stage').Stage;
var util = require('util');

function Pipeline(config) {
	if(config) {
		if(typeof(config) === 'object') {
			delete config.run;
			Stage.call(this, config);
		} else if(typeof(config) === 'function') Stage.call(this);
	}
	this.stages = [];
}
util.inherits(Pipeline, Stage);
exports.Pipeline = Pipeline;
// pushs Stage to specific list if any
// _list is optional
Pipeline.prototype.addStage = function(stage, _list) {
	var list = _list;
	if(typeof(list) == 'string') list = this[list];
	if(!list) list = this.stages;
	if(typeof(stage) === 'function') stage = new Stage(stage);
	list.push(stage);
	this.run = 0; //reset run method
};

// prepares stages for run
Pipeline.prototype.prepareStages = function(sourceList, destList) {
	var stagesLen = sourceList.length;
	for(var i = 0; i < stagesLen; i++) {
		destList.push(this.subscribe(this.stages[i]));
	}
};

// make correct subscription for Stage
Pipeline.prototype.subscribe = function(stage) {
	return function(err, context) {
		var callback = this.slot();
		if(!err) stage.execute(context, callback);
		else callback(err, context);
	};
};

//
Pipeline.prototype.compile = function() {
	var self = this;
	var mainList = [];
	// self.prepareStages(self.stages, mainList);
	var len = self.stages.length;
	var run = function(err, context, done){
		var i = -1;
		var stlen = len;// hack to avoid upper context search;
		var stList = self.stages;
		//consequtive run;
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

Pipeline.prototype.execute = function(context, callback) {
	var self = this;
	if(!self.run) self.compile();
	Pipeline.super_.prototype.execute.apply(this, arguments);
};