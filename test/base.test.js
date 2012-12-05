var Stage = require('../').Stage;
var Context = require('../').Context;
var Pipeline = require('../').Pipeline;

var util = require('util');
var assert = require('assert');

describe('Stage', function() {
	it('works', function(done) {
		done();
	});

	it('emits', function(done) {
		var stage = new Stage();
		stage.once('done', function() {
			done();
		});
		stage.execute(new Context());
	});
	it('ensureContext', function(done) {
		var stage = new Stage();
		var ensure = 0;
		stage.ensureContext = function() {
			ensure++;
			if(typeof(callback) == 'function') callback(null, context);
			else return context;
		};
		stage.execute(new Context());
		assert.equal(ensure, 1, 'ensure must called by default');
		done();
	});
});

describe('Pipeline', function() {
	it('defaults', function(done) {
		var pipe = new Pipeline();
		assert.equal(!pipe.stages, false, 'default stage');
		assert.equal(pipe.stages.length, 0, 'nothing in stages');
		assert.equal(!pipe.run, true, 'default nothing to run');
		assert.throws(function() {
			pipe.compile();
		}, /ANY STAGE FOUND/, 'must throw when there is no stage to compile');
		done();
	});
	it('addStage', function(done) {
		var pipe = new Pipeline();
		pipe.addStage(new Stage());
		assert.equal(pipe.stages.length, 1, 'must adds to default stageList');
		pipe.addStage(new Stage(), 'stages');
		assert.equal(pipe.stages.length, 2, 'must adds to default specified stagelist by string');
		pipe.addStage(new Stage(), pipe.stages);
		assert.equal(pipe.stages.length, 3, 'must adds to default specified stagelist be reference');
		done();
	});
	it('prepareStages', function(done) {
		var pipe = new Pipeline();
		var count = 0;
		pipe.subscribe = function() {
			count++;
		};
		var result = [];
		pipe.prepareStages(pipe.stages, result);
		assert.equal(count, 0, 'no stage... no subscribe...');

		pipe.addStage(new Stage());
		pipe.prepareStages(pipe.stages, result);
		assert.equal(count, 1, 'have stage... then call subscribe...');
		done();
	});
	it('compile', function(done) {
		var pipe = new Pipeline();
		pipe.addStage(new Stage());
		pipe.compile();
		assert.equal(typeof(pipe.run), 'function', 'must have run-function after compile');
		pipe.addStage(new Stage());
		assert.equal(!pipe.run, true, 'after addStage nothing need recompoile');
		done();
	});

	it('execute must call compile and ensure', function(done) {
		var pipe = new Pipeline();
		var compile = 0;
		pipe.addStage(new Stage());
		pipe._compile = pipe.compile;
		pipe.compile = function() {
			compile++;
			this._compile.apply(this, arguments);
		};

		var ensure = 0;
		pipe._ensureContext = pipe.ensureContext;
		pipe.ensureContext = function() {
			ensure++;
			this._ensureContext.apply(this, arguments);	
		};
		pipe.execute(new Context());
		assert.equal(ensure, 1, 'must ensure');
		assert.equal(compile, 1, 'must compile');

		pipe.execute(new Context());
		assert.equal(ensure, 2, 'must ensure');
		assert.equal(compile, 1, 'must not compile second time');
		done();
	});

	it('context catch all errors', function(done) {
		var pipe = new Pipeline();
		var s1 = new Stage();
		var s2 = new Stage();
		var s3 = new Stage();

		var ctx1 = new Context();
		var error = new Error('THE ERROR');
		s1.execute = function(context) {
			assert.equal(context, ctx1, 'context must be passed to s1');
			var self = this;
			context.s1 = true;
			self.emit('done');
		};

		s2.execute = function(context) {
			assert.equal(context, ctx1, 'context must be passed to s2');
			var self = this;
			context.s2 = true;
			self.emit('error', error);
		};

		s3.execute = function(context) {
			assert.equal(true, false, 's3 must not be executed at all');
			var self = this;
			context.s3 = true;
			self.emit('done');
		};

		pipe.addStage(s1);
		pipe.addStage(s2);
		pipe.once('done', function(err, context){
			assert.equal(err === error, true);
			assert.equal(ctx1.s1, true, 's1 pass');
			assert.equal(ctx1.s2, true, 's2 pass');
			assert.equal(ctx1.s3, undefined, 's3 not passed');
			done();
		});
		pipe.execute(ctx1);
	});
});