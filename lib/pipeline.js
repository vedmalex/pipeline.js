var Stage = require('./stage').Stage;
var util = require('util');
var twostep = require('twostep');

function Pipeline() {
	Stage.apply(this, arguments);
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
		if(!err) {
			stage.once('done', function() {
				callback(null, context);
			});
			stage.once('error', function(err) {
				if(err) {
					context.addError(err);
					callback(err);
				} else callback(new Error('throw error without error'));
			});
			stage.execute(context);
		} else callback(err, context);
	};
};

Pipeline.prototype.run = 0;
//
Pipeline.prototype.compile = function() {
	var self = this;
	var mainList = [];

	self.prepareStages(self.stages, mainList);

	if(mainList.length > 0) {
		self.run = twostep.fn.apply(twostep.fn, mainList);
	} else throw new Error('ANY STAGE FOUND');
};

Pipeline.prototype.execute = function(context) {
	var self = this;
	if(!self.run) self.compile();
	self.ensureContext(context, function(err, context) {
		if(!err) self.run(null, context, function(err) {
			self.emit('done', err);
		});
		else self.emit('done', err);
	});
};