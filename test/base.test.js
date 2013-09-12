var Stage = require('../').Stage;
var Context = require('../').Context;
var Pipeline = require('../').Pipeline;
var Sequential = require('../').Sequential;
var Parallel = require('../').Parallel;
var IfElse = require('../').IfElse;
var MultiWaySwitch = require('../').MultiWaySwitch;


var Util = require('../').Util;

var schema = require('js-schema');
var util = require('util');
var assert = require('assert');

describe('Stage', function() {

	it('works', function(done) {
		done();
	});

	it('not allows to use constructor as a function', function(done) {
		try {
			var s = Stage();
		} catch (err) {
			done();
		}
	});

	it('converts context if it is not typeof Context in emit', function(done) {
		var stage = new Stage(function(err, context, done) {
			done();
		});
		stage.once('done', function(context) {
			assert.equal(context instanceof Context, true);
			assert.equal(!context.getChilds, false);
			done();
		});
		stage.execute({});
	});

	it('converts context if it is not typeof Context in callback', function(done) {
		var stage = new Stage(function(err, context, done) {
			done();
		});

		stage.execute({}, function(err, context) {
			assert.equal(context instanceof Context, true);
			assert.equal(!context.getChilds, false);
			done();
		});
	});

	it('emits done', function(done) {
		var stage = new Stage(function(err, context, done) {
			done();
		});
		stage.once('done', function(conext) {
			assert.equal(!context, false);
			done();
		});
		stage.execute({});
	});

	// it('extra parameters to emit and to callback', function(done){
	// 	// сделать передачу дополнительных параметров в done, по принципу err, p1,p2,p3...
	// });
	it('emits error with context', function(done) {
		var stage = new Stage(function(err, context, done) {
			done(new Error());
		});

		stage.once('error', function(err, conext) {
			assert.equal(!err, false);
			assert.equal(!context, false);
			done();
		});
		stage.execute({});
	});

	it('emits error if it configured to do so', function(done) {
		var stage = new Stage(function(err, context, done) {
			done(new Error());
		});
		stage.emitAnyway = true;
		stage.once('error', function(err, conext) {
			assert.equal(!err, false);
			assert.equal(!context, false);
			done();
		});

		stage.execute({}, function(err, data) {});
	});

	it('emits done if it configured to do so', function(done) {
		var stage = new Stage(function(err, context, done) {
			done();
		});
		stage.emitAnyway = true;
		stage.once('done', function(err, conext) {
			assert.equal(!context, false);
			done();
		});

		stage.execute({}, function(err, data) {});
	});

	it('ensureContext', function(done) {
		var stage = new Stage();
		var ensure = 0;
		stage.ensure = function() {
			ensure++;
		};
		stage.execute({});
		assert.equal(ensure, 1, 'ensure must called by default');
		done();
	});

	it('accept callback', function(done) {
		var stage = new Stage(function(err, context, done) {
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

	it('check run is function', function(done) {
		var stage = new Stage();
		var ensure = 0;
		var ctx = new Context({});
		stage.once('error', function(err) {
			assert.equal(ctx.hasErrors(), true);
			assert.equal(/stage Stage reports\: run is not a function/.test(err.toString()), true);
			done();
		});
		stage.execute(ctx, 100);
	});

	it('stage with no run call callback with error', function(done) {
		var stage = new Stage();
		var ctx = new Context();
		stage.execute(ctx, function(err, context) {
			assert.equal(ctx, context);
			assert.equal(/stage Stage reports\: run is not a function/.test(err.toString()), true);
			done();
		});
	});

	it('allow reenterability', function(done) {
		var st = new Stage(function(err, context, done) {
			context.one++;
			done();
		});
		var l = 0;

		function gotit() {
			if (++l == 20) done();
		}
		for (var i = 0; i < 20; i++) {
			var ctx1 = new Context({
				one: 1
			});
			st.execute(ctx1, function(err, data) {
				process.nextTick(function() {
					assert.equal(ctx1.one, 2);
					gotit();
				});
			});
		}
	});

	// it('addStage converts valid object structure to Stage', function(done){
	// });
});

describe('Context', function() {
	it('default empty', function(done) {
		var ctx = new Context();
		assert.equal(ctx.$$$parent === undefined, true, "MUST BE EMPTY");
		assert.equal(ctx.$$$errors === undefined, true, "MUST BE EMPTY");
		assert.equal(ctx.$$$childs === undefined, true, "MUST BE EMPTY");
		done();
	});

	it('not allows to use constructor as a function', function(done) {
		try {
			var s = Context();
		} catch (err) {
			done();
		}
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
		var context = new Context({
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

	it('fork with extra config', function(done) {
		var ctx = new Context({
			some: 1
		});
		var subCtx = ctx.fork({
			another: 1
		});
		assert.equal(subCtx.another, 1);
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

	it('not allows to use constructor as a function', function(done) {
		try {
			var s = Pipeline();
		} catch (err) {
			done();
		}
	});

	it('addStage', function(done) {
		var pipe = new Pipeline();
		pipe.addStage(new Stage());
		assert.equal(pipe.stages.length, 1, 'must adds to default stageList');
		pipe.addStage(new Stage(), 'stages0');
		assert.equal(pipe.stages0.length, 1, 'must adds to default specified stagelist by string');
		pipe.addStage(new Stage(), pipe.stages0);
		assert.equal(pipe.stages0.length, 2, 'must adds to default specified stagelist be reference');
		pipe.addStage(null, pipe.stages0);
		assert.equal(pipe.stages0.length, 3, 'must adds to default specified stagelist be reference');
		assert.equal(pipe.stages0[2] instanceof Stage, true);
		done();
	});

	it('addStage converts funciton to Stage Instance', function(done) {
		var pipe = new Pipeline();
		pipe.addStage(function(err, ctx, done) {
			done();
		});
		assert.equal(pipe.stages[0].reportName(), 'stage Stage', 'function is converted to Stage instance');
		done();
	});

	it('addStage converts object to Stage Instance', function(done) {
		var pipe = new Pipeline();
		pipe.addStage({
			run: function(err, ctx, done) {
				done();
			}
		});
		assert.equal(pipe.stages[0].reportName(), 'stage Stage', 'function is converted to Stage instance');
		done();
	});

	it('accept array of stages', function(done) {
		var f1 = function(err, ctx, done) {
			done();
		};
		var f2 = function(err, ctx, done) {
			done();
		};

		var pipe = new Pipeline([f1, f2]);
		pipe.addStage(function(err, ctx, done) {
			done();
		});
		assert.equal(pipe.stages[0].reportName(), 'stage Stage', 'function is converted to Stage instance');
		assert.equal(pipe.stages[1].reportName(), 'stage Stage', 'function is converted to Stage instance');
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
		pipe.addStage(new Stage(function(err, context, done) {
			done();
		}));
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
		pipe.execute({});
		assert.equal(ensure, 1, 'must ensure');
		assert.equal(compile, 1, 'must compile');

		pipe.execute({});
		assert.equal(ensure, 2, 'must ensure');
		assert.equal(compile, 1, 'must not compile second time');
		done();
	});

	it('executes pipes in pipes', function(done) {
		var pipe = new Pipeline();
		var nestedpipe = new Pipeline();
		nestedpipe.addStage(function(err, ctx, done) {
			ctx.item = 1;
			done();
		});
		pipe.addStage(nestedpipe);
		pipe.execute({
			item: 0
		}, function(err, ctx) {
			assert.equal( !! err, false);
			done();
		});

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
		pipe.once('error', function(err) {
			assert.equal(!err, false);
			assert.equal(ctx1.hasErrors(), true, 'must has errors 1');
			assert.equal(ctx1.getErrors()[0] == error, true, 'must has error 2');
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
				if (context.SomeValue !== 1) callback(error);
				else callback(null, context);
			}
		};
		pipe.addStage(new Stage(stage1));
		var stage2 = {
			ensure: function(context, callback) {
				console.log();
				if (context.SomeValue !== 1) callback(new Error(this.reportName() + ': Wrong Value'));
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
			validate: type1,
			run: function(err, context, done) {
				done();
			}
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

	it('allow reenterability', function(done) {


		var pipe = new Pipeline();
		var st = new Stage(function(err, context, done) {
			context.one++;
			done();
		});
		pipe.addStage(function(err, context, done) {
			process.nextTick(function() {
				context.one++;
				done();
			});
		});

		pipe.addStage(function(err, context, done) {
			process.nextTick(function() {
				context.one += 1;
				done();
			});
		});

		pipe.addStage(function(err, context, done) {
			context.one += 5;
			done();
		});

		var l = 0;

		function gotit() {
			if (++l == 20) done();
		}
		for (var i = 0; i < 20; i++) {
			var ctx1 = new Context({
				one: 1
			});
			pipe.execute(ctx1, function(err, data) {
				process.nextTick(function() {
					assert.equal(ctx1.one, 8);
					gotit();
				});
			});
		}
	});
});

describe('Sequential', function() {
	it('works with default', function(done) {
		var stage = new Sequential();
		stage.execute({}, function(err, context) {
			assert.equal(context instanceof Context, true);
			done();
		});
	});
	it('not allows to use constructor as a function', function(done) {
		try {
			var s = Sequential();
		} catch (err) {
			done();
		}
	});
	it('run stage', function(done) {
		var stage0 = new Stage(function(err, ctx, done) {
			ctx.iter++;
			done();
		});
		var stage = new Sequential({
			stage: stage0,
			reachEnd: function(err, ctx, iter) {
				return err || iter == 10;
			}
		});
		stage.execute({
			iter: -1
		}, function(err, context) {
			assert.equal(context.iter, 9);
			done();
		});
	});

	it('prepare context', function(done) {
		var stage0 = new Stage(function(err, ctx, done) {
			ctx.iter++;
			done();
		});
		var cnt = 0;
		var stage = new Sequential({
			stage: stage0,
			prepareContext: function(ctx) {
				return {
					iter: ctx.iter
				};
			},
			split: function(ctx, iter) {
				cnt++;
				return ctx.fork();
			},
			reachEnd: function(err, ctx, iter) {
				return err || iter == 10;
			}
		});
		stage.execute({
			iter: -1
		}, function(err, context) {
			assert.equal(context.iter, -1);
			assert.equal(cnt, 10);
			done();
		});
	});

	it('complex example 1', function(done) {

		var stage0 = new Stage({
			run: function(err, ctx, done) {
				ctx.liter = 1;
				done();
			}
		});
		var ctx = {
			some: [1, 2, 3, 4, 5, 6, 7]
		};
		var len = ctx.some.length;
		var stage = new Sequential({
			stage: stage0,
			split: function(ctx, iter) {
				return {
					iter: ctx.some[iter]
				};
			},
			reachEnd: function(err, ctx, iter) {
				return err || iter == len;
			},
			combine: function(innerCtx, ctx, childs) {
				var len = childs.length;
				ctx.result = 0;
				for (var i = 0; i < len; i++) {
					ctx.result += childs[i].liter;
				}
			}
		});

		stage.execute(ctx, function(err, context) {
			assert.equal(context.result, 7);
			done();
		});
	});

	it('complex example 1 error handling', function(done) {
		var stage0 = new Stage({
			run: function(err, ctx, done) {
				ctx.liter = 1;
				if (ctx.iter === 4) done(new Error());
				else done();
			}
		});
		var ctx = {
			some: [1, 2, 3, 4, 5, 6, 7]
		};
		var len = ctx.some.length;
		var stage = new Sequential({
			stege: stage0,
			split: function(ctx, iter) {
				return {
					iter: ctx.some[iter]
				};
			},
			reachEnd: function(err, ctx, iter) {
				return err || iter == len;
			},
			combine: function(innerCtx, ctx, childs) {
				var len = childs.length;
				ctx.result = 0;
				for (var i = 0; i < len; i++) {
					ctx.result += childs[i].liter;
				}
			}
		});

		stage.execute(ctx, function(err, context) {
			assert.equal(!context.result, true);
			done();
		});
	});

	it('cheks context as well', function(done) {
		var stage0 = new Stage({
			run: function(err, ctx, done) {
				ctx.liter = 1;
				done();
			}
		});
		var ctx = {
			some: [1, 2, 3, 4, 5, 6, 7]
		};
		var len = ctx.some.length;
		var stage = new Sequential({
			stage: stage0,
			checkContext: function(err, ctx, iter, callback) {
				var _e = ctx.some[iter] > 4 ? new Error() : null;
				callback(_e, ctx);
			},
			split: function(ctx, iter) {
				return {
					iter: ctx.some[iter]
				};
			},
			reachEnd: function(err, ctx, iter) {
				return err || iter == len;
			},
			combine: function(innerCtx, ctx, childs) {
				var len = childs.length;
				ctx.result = 0;
				for (var i = 0; i < len; i++) {
					ctx.result += childs[i].liter;
				}
			}
		});

		stage.execute(ctx, function(err, context) {
			assert.equal( !! err, true);
			done();
		});
	});

	it('complex example 2', function(done) {
		var stage0 = new Stage({
			run: function(err, ctx, done) {
				ctx.liter = 1;
				done();
			}
		});
		var ctx = {
			some: [1, 2, 3, 4, 5, 6, 7]
		};
		var len = ctx.some.length;
		var stage = new Sequential({
			stage: stage0,
			split: function(ctx, iter) {
				return ctx.fork();
			},
			reachEnd: function(err, ctx, iter) {
				return err || iter == len;
			},
			combine: function(innerCtx, ctx, chlds) {
				var childs = ctx.getChilds();
				var len = childs.length;
				ctx.result = 0;
				for (var i = 0; i < len; i++) {
					ctx.result += childs[i].liter;
				}
			}
		});

		stage.execute(ctx, function(err, context) {
			assert.equal(context.result, 7);
			done();
		});

	});

});

describe('Parallel', function() {

	it('works with default', function(done) {
		var stage = new Parallel();
		stage.execute({}, function(err, context) {
			assert.equal(context instanceof Context, true);
			done();
		});
	});
	it('not allows to use constructor as a function', function(done) {
		try {
			var s = Parallel();
		} catch (err) {
			done();
		}
	});
	it('run stage', function(done) {
		var stage0 = new Stage(function(err, ctx, done) {
			ctx.iter++;
			done();
		});
		var stage = new Parallel({
			stage: stage0
		});
		stage.execute({
			iter: 1
		}, function(err, context) {
			assert.equal(context.iter, 2);
			done();
		});
	});

	it('run with empty result of split', function(done) {
		var stage0 = new Stage(function(err, ctx, done) {
			ctx.iter++;
			done();
		});
		var stage = new Parallel({
			stage: stage0,
			split: function() {
				return null;
			}
		});
		stage.execute({
			iter: 1
		}, function(err, context) {
			assert.equal(context.iter, 1);
			done();
		});
	});

	it('complex example 1', function(done) {
		var stage0 = new Stage(function(err, ctx, done) {
			ctx.liter = 1;
			done();
		});
		var ctx = {
			some: [1, 2, 3, 4, 5, 6, 7]
		};
		var len = ctx.some.length;
		var stage = new Parallel({
			stage: stage0,
			split: function(ctx, iter) {
				var res = [];
				var len = ctx.some.length;
				for (var i = 0; i < len; i++) {
					res.push({
						some: ctx.some[i]
					});
				}
				return res;

			},
			exHandler: function(err, ctx, iter) {
				return err;
			},
			combine: function(ctx, childs) {
				var len = childs.length;
				ctx.result = 0;
				for (var i = 0; i < len; i++) {
					ctx.result += childs[i].liter;
				}
			}
		});
		stage.execute(ctx, function(err, context) {
			assert.equal(context.result, 7);
			done();
		});
	});

	it('complex example 1 - Error Handling', function(done) {
		var stage0 = new Stage(function(err, ctx, done) {
			ctx.liter = 1;
			if (ctx.some == 4) done(new Error());
			if (ctx.some == 5) done(new Error());
			else done();
		});
		var ctx = {
			some: [1, 2, 3, 4, 5, 6, 7]
		};
		var len = ctx.some.length;
		var stage = new Parallel({
			stage: stage0,
			split: function(ctx, iter) {
				var res = [];
				var len = ctx.some.length;
				for (var i = 0; i < len; i++) {
					res.push({
						some: ctx.some[i]
					});
				}
				return res;

			},
			exHandler: function(err, ctx, iter) {
				return err;
			},
			combine: function(ctx, childs) {
				var len = childs.length;
				ctx.result = 0;
				for (var i = 0; i < len; i++) {
					ctx.result += childs[i].liter;
				}
			}
		});
		stage.execute(ctx, function(err, context) {
			assert.equal(err instanceof Array, true);
			assert.equal(err.length, 2);
			assert.equal(!context.result, true);
			done();
		});
	});

	it('complex example 2', function(done) {
		var stage0 = new Stage(function(err, ctx, done) {
			ctx.liter = 1;
			done();
		});
		var ctx = {
			some: [1, 2, 3, 4, 5, 6, 7]
		};
		var len = ctx.some.length;
		var stage = new Parallel({
			stage: stage0,
			split: function(ctx, iter) {
				var res = [];
				var len = ctx.some.length;
				for (var i = 0; i < len; i++) {
					res.push(ctx.fork());
				}
				return res;
			},
			exHandler: function(err, ctx, iter) {
				return err || iter == len;
			},
			combine: function(ctx) {
				var childs = ctx.getChilds();
				var len = childs.length;
				ctx.result = 0;
				for (var i = 0; i < len; i++) {
					ctx.result += childs[i].liter;
				}
			}
		});

		stage.execute(ctx, function(err, context) {
			assert.equal(context.result, 7);
			done();
		});

	});

});

describe('if->else', function() {
	it('simple works', function(done) {
		var stage = new IfElse();
		stage.execute({}, function(err, context) {
			assert.equal(context instanceof Context, true);
			done();
		});
	});
	it('not allows to use constructor as a function', function(done) {
		try {
			var s = IfElse();
		} catch (err) {
			done();
		}
	});
	it('simple works sucess', function(done) {
		var s0 = new Stage(function(err, ctx, done) {
			ctx.done = true;
			done();
		});
		var stage = new IfElse({
			condition: function(ctx) {
				return true;
			},
			success: s0,
			failed: new Stage()
		});
		stage.execute({}, function(err, context) {
			assert.equal(context.done, true);
			done();
		});
	});

	it('simple works failed', function(done) {
		var s0 = new Stage(function(err, ctx, done) {
			ctx.done = true;
			done();
		});

		var stage = new IfElse({
			condition: function(ctx) {
				return false;
			},
			failed: s0,
			success: new Stage()
		});

		stage.execute({}, function(err, context) {
			assert.equal(context.done, true);
			done();
		});
	});

});

describe('SWITCH', function() {
	it('works', function(done) {
		var sw = new MultiWaySwitch();
		sw.execute({}, function(err, ctx) {
			done();
		});
	});
	it('not allows to use constructor as a function', function(done) {
		try {
			var s = MultiWaySwitch();
		} catch (err) {
			done();
		}
	});
	it('must enter in each pipe works in parallel', function(done) {
		var cnt = 0;
		var pipe0 = new Pipeline([function(err, ctx, done) {
			ctx.p00 = true;
			cnt++;
			done();
		}, function(err, ctx, done) {
			ctx.p01 = true;
			cnt++;
			done();
		}]);
		var pipe1 = new Pipeline([function(err, ctx, done) {
			ctx.p10 = true;
			cnt++;
			done();
		}, function(err, ctx, done) {
			ctx.p11 = true;
			cnt++;
			done();
		}]);
		var pipe2 = new Pipeline([function(err, ctx, done) {
			ctx.p20 = true;
			cnt++;
			done();
		}, function(err, ctx, done) {
			ctx.p21 = true;
			cnt++;
			done();
		}]);

		var sw = new MultiWaySwitch([pipe0, pipe1, pipe2]);
		sw.execute({}, function(err, ctx) {
			assert.equal(6, cnt);
			done();
		});
	});

	it('must enter in each pipe works in parallel', function(done) {
		var pipe0 = new Pipeline([function(err, ctx, done) {
			ctx.cnt = 1;
			done();
		}, function(err, ctx, done) {
			ctx.cnt += 1;
			done();
		}]);
		var pipe1 = new Pipeline([function(err, ctx, done) {
			ctx.cnt = 1;
			done();
		}, function(err, ctx, done) {
			ctx.cnt += 1;
			done();
		}]);

		var sw = new MultiWaySwitch({
			cases: [pipe0, pipe1],
			split: function(ctx) {
				return ctx.fork();
			},
			combine: function(ctx, retCtx) {
				ctx.size += retCtx.cnt;
			}
		});
		sw.execute({
			size: 0
		}, function(err, ctx) {
			assert.equal(ctx.size, 4);
			done();
		});
	});
	it('exception errors for', function(done) {
		var pipe0 = new Pipeline([function(err, ctx, done) {
			ctx.cnt = 1;
			done();
		}, function(err, ctx, done) {
			ctx.cnt += 1;
			done(new Error());
		}]);
		var pipe1 = new Pipeline([function(err, ctx, done) {
			ctx.cnt = 1;
			done();
		}, function(err, ctx, done) {
			ctx.cnt += 1;
			done();
		}]);

		var sw = new MultiWaySwitch({
			cases: [pipe0, pipe1],
			split: function(ctx) {
				return ctx.fork();
			},
			combine: function(ctx, retCtx) {
				ctx.size += retCtx.cnt;
			},
			exHandler: function(err, ctx) {
				return err;
			}
		});
		sw.execute({
			size: 0
		}, function(err, ctx) {
			assert.equal(ctx.size, 2);
			assert.equal(err instanceof Array, true);
			done();
		});
	});

	it('exception errors for 2', function(done) {
		var pipe0 = new Pipeline([function(err, ctx, done) {
			ctx.cnt = 1;
			done();
		}, function(err, ctx, done) {
			ctx.cnt += 1;
			done();
		}]);
		var pipe1 = new Pipeline([function(err, ctx, done) {
			ctx.cnt = 1;
			done(new Error());
		}, function(err, ctx, done) {
			ctx.cnt += 1;
			done();
		}]);

		var sw = new MultiWaySwitch({
			cases: [pipe0, pipe1],
			split: function(ctx) {
				return ctx.fork();
			},
			combine: function(ctx, retCtx) {
				ctx.size += retCtx.cnt;
			},
			exHandler: function(err, ctx) {
				return err;
			}
		});
		sw.execute({
			size: 0
		}, function(err, ctx) {
			assert.equal(ctx.size, 2);
			assert.equal(err instanceof Array, true);
			done();
		});
	});

	it('exception handler work', function(done) {
		var pipe0 = new Pipeline([function(err, ctx, done) {
			ctx.cnt = 1;
			done();
		}, function(err, ctx, done) {
			ctx.cnt += 1;
			done();
		}]);
		var pipe1 = new Pipeline([function(err, ctx, done) {
			ctx.cnt = 1;
			done();
		}, function(err, ctx, done) {
			ctx.cnt += 1;
			done(new Error());
		}]);

		var sw = new MultiWaySwitch({
			cases: [pipe0, pipe1],
			split: function(ctx) {
				return ctx.fork();
			},
			combine: function(ctx, retCtx) {
				ctx.size += retCtx.cnt;
			},
			exHandler: function(err, ctx) {
				return false;
			}
		});
		sw.execute({
			size: 0
		}, function(err, ctx) {
			assert.equal(ctx.size, 4);
			assert.equal( !! err, false);
			done();
		});
	});

	it('not evaluate if missing evaluate property', function(done) {
		var pipe0 = new Pipeline([function(err, ctx, done) {
			ctx.cnt = 1;
			done();
		}, function(err, ctx, done) {
			ctx.cnt += 1;
			done();
		}]);
		var pipe1 = new Pipeline([function(err, ctx, done) {
			ctx.cnt = 1;
			done();
		}, function(err, ctx, done) {
			ctx.cnt += 1;
			done(new Error());
		}]);

		var sw = new MultiWaySwitch({
			cases: [pipe0, {
				stage: pipe1,
				exHandler: function() {
					return false;
				}
			}],
			split: function(ctx) {
				return ctx.fork();
			},
			combine: function(ctx, retCtx) {
				ctx.size += retCtx.cnt;
			}
		});
		sw.execute({
			size: 0
		}, function(err, ctx) {
			assert.equal(ctx.size, 2);
			assert.equal( !! err, false);
			done();
		});
	});

	it('individual exception handler work', function(done) {
		var pipe0 = new Pipeline([function(err, ctx, done) {
			ctx.cnt = 1;
			done();
		}, function(err, ctx, done) {
			ctx.cnt += 1;
			done();
		}]);
		var pipe1 = new Pipeline([function(err, ctx, done) {
			ctx.cnt = 1;
			done();
		}, function(err, ctx, done) {
			ctx.cnt += 1;
			done(new Error());
		}]);

		var sw = new MultiWaySwitch({
			cases: [pipe0, {
				stage: pipe1,
				evaluate: true,
				exHandler: function() {
					return false;
				}
			}],
			split: function(ctx) {
				return ctx.fork();
			},
			combine: function(ctx, retCtx) {
				ctx.size += retCtx.cnt;
			}
		});
		sw.execute({
			size: 0
		}, function(err, ctx) {
			assert.equal(ctx.size, 4);
			assert.equal( !! err, false);
			done();
		});
	});

	it('not throw any expections if there is no actions to do', function(done) {

		var sw = new MultiWaySwitch({
			cases: [{
				evaluate: false,
				stage: new Stage(function(err, ctx, done) {
					done();
				})
			}, {
				evaluate: false,
				stage: new Stage(function(err, ctx, done) {
					done();
				})
			}]
		});
		sw.execute({}, function(err, ctx) {
			assert.equal( !! err, false);
			done();
		});
	});

	it('can use function to define stage', function(done) {

		var sw = new MultiWaySwitch({
			cases: [{
				evaluate: false,
				stage: new Stage(function(err, ctx, done) {
					done();
				})
			}, {
				evaluate: true,
				stage: function(err, ctx, done) {
					done();
				}
			}]
		});
		sw.execute({}, function(err, ctx) {
			assert.equal( !! err, false);
			done();
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

describe('Utils', function() {
	it('getClass works', function(done) {
		var v = new Stage();
		var p = new Pipeline();
		var c = new Context();
		assert.equal(Util.getClass(v), 'Stage');
		assert.equal(Util.getClass(p), 'Pipeline');
		assert.equal(Util.getClass(c), 'Context');
		done();
	});
});