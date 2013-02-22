var Stage = require('./stage').Stage;
var Context = require('./context').Context;
var util = require('./util.js').Util;

function Sequential(config) {
	if(!(this instanceof Sequential)) throw new Error('constructor is not a function');
	Stage.apply(this);
	if(!config) config = {};
	if(config instanceof Stage) config = {
		stage: config
	}; /*stage, split, reachEnd, combine*/
	if(config.stage instanceof Stage) this.stage = config.stage;
	else if(config.stage instanceof Function) this.stage = new Stage(config.stage);
	else this.stage = new Stage();
	this.prepareContext = config.prepareContext instanceof Function ? config.prepareContext : function(ctx) {
		return ctx;
	};
	this.split = config.split instanceof Function ? config.split : function(ctx, iter) {
		return ctx;
	};
	this.reachEnd = config.reachEnd instanceof Function ? config.reachEnd : function(err, ctx, iter) {
		return true;
	};
	this.combine = config.combine instanceof Function ? config.combine : null;
	this.checkContext = config.checkContext instanceof Function ? config.checkContext : function(err, ctx, iter, callback) {
		callback(err, ctx);
	};
}

util.inherits(Sequential, Stage);

exports.Sequential = Sequential;
var StageProto = Sequential.super_.prototype;
var SequentialProto = Sequential.prototype;

SequentialProto.compile = function() {
	var self = this;
	var run = function(err, ctx, done) {
			var iter = -1;
			var childsCtx = [];
			var combine = function(err) {
					if(!err && self.combine) self.combine(innerCtx, ctx, childsCtx);
					done(err);
				};
			var innerCtx = self.prepareContext(ctx);
			if(!(innerCtx instanceof Context)) innerCtx = new Context(innerCtx);
			var next = function(err, retCtx) {
					iter++;
					if(iter > 0) childsCtx.push(retCtx);
					self.checkContext(err, innerCtx, iter, function(err, innerCtx) {
						if(self.reachEnd(err, innerCtx, iter)) combine(err, iter);
						else {
							self.stage.execute(self.split(innerCtx, iter), next);
						}
					});
				};
			next();
		};
	self.run = run;
};

SequentialProto.execute = function(context, callback) {
	var self = this;
	if(!self.run) self.compile();
	StageProto.execute.apply(this, arguments);
};