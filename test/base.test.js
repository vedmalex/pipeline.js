var Stage = require('../').Stage;
var Context = require('../').Context;
var Pipeline = require('../').Pipeline;
var ContextFactory = require('../').ContextFactory;
var Util = require('../').Util;

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
		};
		stage.execute(new Context());
		assert.equal(ensure, 1, 'ensure must called by default');
		done();
	});

	it('accept callback',function(done){
		var stage = new Stage(function(err, context,done){
			done();
		});
		var ensure = 0;
		var ctx = new Context({});
		stage.execute(ctx, function(err, context) {
			assert.equal(ctx, context);
			assert.equal(!err, true);
			done();
		});
	});

	it('check callback is function',function(done){
		var stage = new Stage();
		var ensure = 0;
		var ctx = new Context({});
		stage.once('done', function(){
			done();
		});
		stage.execute(ctx, 100);
	});

	it('stage with no run call callback',function(done){
		var stage = new Stage();
		var ctx = new Context();
		stage.execute(ctx, function(err, context) {
			assert.equal(ctx, context);
			assert.equal(!err, true);
			done();
		});
	});

	it('allow reenterability', function(done){
		var ctx1 = new Context({one:1});
		var ctx2 = new Context({one:2});
		var st = new Stage(function(err, context, done){
			context.one++;
			done();
		});
		var i =0;
		function gotit(){
			if(++i == 2) done();
		}
		
		st.execute(ctx1, function(err, data){
			assert.equal(ctx1.one, 2);
			gotit();
		});
		st.execute(ctx2, function(err, data){
			assert.equal(ctx2.one, 3);
			gotit();
		});
	});

});

describe('Context', function() {
	it('default empty', function(done) {
		var ctx = new Context();
		assert.equal(ctx.$$$parent === undefined, true, "MUST BE EMPTY");
		assert.equal(ctx.$$$errors === undefined, true, "MUST BE EMPTY");
		assert.equal(ctx.$$$childs === undefined, true, "MUST BE EMPTY");
		done();
	});

	it('object must presented as links', function(done) {
		var config = {
			config: {
				some: 1
			},
			notConfig: 2
		};
		var ctx = new Context(config);
		ctx.notConfig = 3;
		config.config.some = 2;
		assert.notEqual(config.notConfig, ctx.notConfig);
		assert.equal(config.config.some, ctx.config.some);
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
		assert.equal(ctx.$$$childs.length, 1, "MUST HAVE CHILDS");
		assert.equal(ctx.config.some, ctx2.config.some, "MUST BE EQUAL");
		assert.equal(ctx.notConfig, ctx2.notConfig, "MUST BE EQUAL");
		assert.equal(ctx2.getParent() === ctx, true, "parent is context");
		done();
	});

	it('all errors goes to top most Parent', function(done) {
		var context =  new Context({
			a: 1,
			b: 2,
			c: 3
		});
		var child = context.fork();
		var childchild = child.fork();
		childchild.addError(new Error());
		assert.equal(childchild.hasErrors(), true);
		assert.equal(child.hasErrors(), true);
		assert.equal(context.hasErrors(), true);
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

	it('addStage converts funciton to Stage Instance', function(done) {
		var pipe = new Pipeline();
		pipe.addStage(function(err, ctx, done){
			done();
		});
		assert.equal(pipe.stages[0].reportName(),'stage Stage', 'function is converted to Stage instance');
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

	it('ensure Context Error use', function(done) {
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
				console.log();
				if(context.SomeValue !== 1) callback(new Error( this.reportName() + ': Wrong Value'));
				else callback(null, context);
			}
		};
		var s2 = new Stage(stage2);
		pipe.addStage(s2);
		pipe.once('done', function(err) {
			assert.equal(true, false, "must fail");
			done();
		});
		pipe.once('error', function(err) {
			assert.equal(/stage Stage\: Wrong Value/.test(err.toString()), true);
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

	it('allow reenterability', function(done){
		var ctx1 = new Context({one:1});
		var ctx2 = new Context({one:2});
		var pipe = new Pipeline();

		pipe.addStage(function(err, context, done){
			process.nextTick(function(){
				context.one++;
				done();
			});
		});

		pipe.addStage(function(err, context, done){
			process.nextTick(function(){
				context.one+=1;
				done();
			});
		});

		pipe.addStage(function(err, context, done){
			context.one += 5;
			done();
		});

		var i =0;
		function gotit(){
			if(++i == 2) done();
		}
		
		pipe.execute(ctx1, function(err, data){
			assert.equal(ctx1.one, 8);
			gotit();
		});

		pipe.execute(ctx2, function(err, data){
			assert.equal(ctx2.one, 9);
			gotit();
		});
	});
});

describe('inheritence', function() {
	it('override property', function(done) {
		var ctx = {
			db: {
				connection: 'localhost'
			}
		};
		var context = new Context({
			age: 10,
			num: '#1001',
			data: new Date(1978, 10, 10),
			context: ctx
		});

		var clone = Object.create(context);
		clone.age = 15;
		assert.equal(context.age, 10, 'age stays the same');
		assert.equal(context.num, '#1001', 'num stays the same');
		assert.equal(context.data.toString(), (new Date(1978, 10, 10)).toString(), 'date stays the same');
		assert.equal(context.context, ctx, 'date stays the same');

		done();
	});
});

describe('Context factory', function() {
	it('creates empty context', function(done) {
		var context = ContextFactory();
		assert.equal(!context, false, "MUST RETURN CONTEXT");
		done();
	});

	it('creates childs context', function(done) {
		var context = ContextFactory({
			a: 1,
			b: 2,
			c: 3
		});
		var child = context.fork();
		child.c = 4;
		child.d = 5;
		context.a = 0;
		assert.equal(context.a, child.a, 'must be the same if not overrided');
		assert.equal(context.c, 3, 'must be the same if not overrided');
		assert.equal(child.c, 4, 'must be the same if not overrided');
		assert.equal(context.b, child.b, 'must be the same if not overrided');
		assert.equal(context.d === undefined, true, 'this is different objects');
		assert.equal(context, child.getParent(), 'paren the same');
		assert.equal(context.getChilds()[0], child);
		done();
	});

	it('each context in child can have its own child', function(done) {
		var context = ContextFactory({
			a: 1,
			b: 2,
			c: 3
		});
		var child = context.fork();
		var childchild = child.fork();

		assert.equal(!context, false);
		assert.equal(context.getChilds().length, 1);

		assert.equal(!child, false);
		assert.equal(child.getChilds().length, 1);

		assert.equal(!childchild, false);

		done();
	});

	it('all errors goes to top most Parent', function(done) {
		var context = ContextFactory({
			a: 1,
			b: 2,
			c: 3
		});
		var child = context.fork();
		var childchild = child.fork();
		childchild.addError(new Error());
		assert.equal(childchild.hasErrors(), true);
		assert.equal(child.hasErrors(), true);
		assert.equal(context.hasErrors(), true);
		done();
	});
});

describe('Utils', function(){
	it('getClass works', function(done){
		var v = new Stage();
		var p = new Pipeline();
		var c = new Context();
		assert.equal(Util.getClass(v),'Stage');
		assert.equal(Util.getClass(p),'Pipeline');
		assert.equal(Util.getClass(c),'Context');
		done();
	});
});