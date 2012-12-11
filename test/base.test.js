var Stage = require('../').Stage;
var Context = require('../').Context;
var Pipeline = require('../').Pipeline;

var schema = require('js-schema');
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
		stage.ensure = function() {
			ensure++;
			if(typeof(callback) == 'function') callback(null, context);
			else return context;
		};
		stage.execute(new Context());
		assert.equal(ensure, 1, 'ensure must called by default');
		done();
	});
});

describe('Context', function() {
	it('default empty', function(done){
		var ctx = new Context();
		assert.equal(ctx.$$$parent === undefined, true, "MUST BE EMPTY");
		assert.equal(ctx.$$$errors === undefined, true, "MUST BE EMPTY");
		assert.equal(ctx.$$$childs === undefined, true, "MUST BE EMPTY");
		done();
	});

	it('copy config', function(done) {
		var config = {
			config: {
				some: 1
			},
			notConfig: 2
		};
		var ctx = new Context(config);
		config.config.some = 2;
		assert.notEqual(config.config.some, ctx.config.some);
		done();
	});

	it('fork getChilds', function(done) {
		var childs = new Context().getChilds();
		assert.equal(childs.length, 0, "MUST BE EQUAL");
		done();
	});

	it('fork getParent', function(done) {
		var parent = new Context().getParent();
		assert.equal(parent === undefined, true, "MUST BE EQUAL");
		done();
	});

	it('fork child', function(done) {
		var config = {
			config: {
				some: 1
			},
			notConfig: 2
		};
		var ctx = new Context(config);
		var ctx2 = ctx.fork();
		assert.equal(ctx.$$$childs.length, 1,"MUST HAVE CHILDS");
		assert.equal(ctx.config.some, ctx2.config.some, "MUST BE EQUAL");
		assert.equal(ctx.notConfig, ctx2.notConfig, "MUST BE EQUAL");
		assert.equal(ctx2.getParent() === ctx, true, "parent is context");
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
		pipe._ensure = pipe.ensure;
		pipe.ensure = function() {
			ensure++;
			this._ensure.apply(this, arguments);
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
		var ctx1 = new Context({
			s1: false,
			s2: false,
			s3: false
		});
		var error = new Error('THE ERROR');

		var s1 = new Stage(function(err, context, done) {
			assert.equal(context, ctx1, 'context must be passed to s1');
			context.s1 = true;
			done();
		});
		var s2 = new Stage(function(err, context, done) {
			assert.equal(context, ctx1, 'context must be passed to s2');
			context.s2 = true;
			done(error);
		});
		var s3 = new Stage(function(err, context, done) {
			assert.equal(true, false, 's3 must not be executed at all');
			context.s3 = true;
			done();
		});


		pipe.addStage(s1);
		pipe.addStage(s2);
		pipe.once('error', function() {
			assert.equal(ctx1.hasErrors(), true, 'must has errors');
			assert.equal(ctx1.getErrors()[0] == error, true, 'must has error');
			assert.equal(ctx1.s1, true, 's1 pass');
			assert.equal(ctx1.s2, true, 's2 pass');
			assert.equal(ctx1.s3, false, 's3 not passed');
			done();
		});
		pipe.execute(ctx1);
	});

	it('ensure Context Error ', function(done) {
		var ctx = new Context();
		ctx.SomeValue = 1;
		var pipe = new Pipeline();
		var error = new Error('context not ready');
		var stage1 = {
			run: function(err, context, done) {
				context.SomeValue += 1;
				done();
			},
			ensure: function(context, callback) {
				if(context.SomeValue !== 1) callback(error);
				else callback(null, context);
			}
		};
		pipe.addStage(new Stage(stage1));
		var stage2 = {
			ensure: function(context, callback) {
				if(context.SomeValue !== 2) callback(error);
				else callback(null, context);
			}
		};
		var s2 = new Stage(stage2);
		pipe.addStage(s2);
		pipe.once('done', function(err) {
			done();
		});
		pipe.once('error', function(err) {
			done();
		});
		pipe.execute(ctx);
	});

	it('pipeline accept only ensure', function(done) {
		var ensure = function() {};
		var p1 = new Pipeline(ensure);
		assert.equal(p1.ensure != ensure, true, 'not accept ensure as function');
		assert.equal(p1.run != ensure, true, 'not accept run at all');
		var p2 = new Pipeline({
			ensure: ensure,
			run: ensure
		});
		assert.equal(p2.ensure === ensure, true, 'not accept ensure as function');
		assert.equal(p2.run != ensure, true, 'not accept run at all');
		done();
	});

	it('stage accept ensure, validate and run', function(done) {
		var ensure = function() {};
		var p1 = new Stage(ensure);
		assert.equal(p1.ensure != ensure, true, 'not accept ensure as function');
		assert.equal(p1.validate != ensure, true, 'accept only run as function');
		assert.equal(p1.run == ensure, true, 'accept only run as function');
		var p2 = new Stage({
			ensure: ensure,
			run: ensure,
			validate: ensure
		});
		assert.equal(p2.ensure === ensure, true, 'accept ensure');
		assert.equal(p2.validate === ensure, true, 'accept validate');
		assert.equal(p2.run === ensure, true, 'accept run');
		done();
	});

	it('use schema to override validate', function(done) {
		var type1 = schema({
			some: Object,
			other: String
		});
		var stg = new Stage({
			validate: type1
		});
		var replaced = stg.validate !== Stage.prototype.validate;
		assert.equal(replaced, true, 'validate method must be replaced');
		done();
	});

	it('valid context proceeed execution', function(done) {
		var type1 = schema({
			some: Object,
			other: String
		});
		var stg = new Stage({
			validate: type1
		});
		var ctx = new Context({
			some: {},
			other: 'other'
		});
		stg.once('done', function() {
			done();
		});
		stg.execute(ctx);
	});

	it('invalid context fails execution', function(done) {
		var type1 = schema({
			some: Object,
			other: Number
		});
		var stg = new Stage({
			validate: type1
		});
		var ctx = new Context({
			some: {},
			other: 'other'
		});
		stg.once('error', function(err) {
			done();
		});
		stg.execute(ctx);
	});

	it('can do subclassing of Pipeline', function(done) {
		function newPipe() {
			Pipeline.call(this);
			this.addStage(new Stage());
			this.addStage(new Stage());
			this.addStage(new Stage());
		}
		util.inherits(newPipe, Pipeline);

		var p1 = new newPipe();
		assert.equal(p1.stages.length, 3, 'must be by default 3');
		var p2 = new newPipe();
		p2.addStage(new Stage());
		assert.equal(p2.stages.length, 4, 'must be by default 3 + 1 new');
		var p3 = new newPipe();
		assert.equal(p3.stages.length, 3, 'must be by default 3');
		done();
	});

});