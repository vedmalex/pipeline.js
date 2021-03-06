var index = process.env['COVERAGE'] ? '../index-cov.js' : '../';
var Stage = require(index).Stage;
var Context = require(index).Context;
var Pipeline = require(index).Pipeline;
var Sequential = require(index).Sequential;
var Parallel = require(index).Parallel;
var IfElse = require(index).IfElse;
var Timeout = require(index).Timeout;
var Wrap = require(index).Wrap;
var RetryOnError = require(index).RetryOnError;
var MultiWaySwitch = require(index).MultiWaySwitch;
var DoWhile = require(index).DoWhile;
var Empty = require(index).Empty;
var Util = require(index).Util;

var schema = require('js-schema');
var util = require('util');
var assert = require('assert');

describe('utils', function() {
	var res = Util.getClass(false);
	assert.equal(res, false);
});

describe('Stage', function() {
	describe('sync', function() {

		it('works', function(done) {
			var v1 = new Stage({
				run: function newName1(ctx) {
					ctx.name = 'name';
				}
			});
			v1.execute({}, function(err, ctx) {
				assert(ctx.name == 'name');
				done();
			});
		});

		it('catch errors', function(done) {
			var v1 = new Stage({
				run: function newName1(ctx) {
					ctx.name = 'name';
					throw new Error();
				}
			});
			v1.execute({}, function(err, ctx) {
				assert(err);
				done();
			});
		});
	});

	it('throws error if error is not Error instance', function(done) {
		var st = new Stage(function(ctx, done) {
			done('error');
		});

		st.execute({}, function(err, ctx) {
			assert(err instanceof Error);
			done();
		});
	});

	describe("rescue", function() {
		it('sync', function(done) {
			var st = new Stage({
				rescue: function(err, ctx) {
					assert.equal('some', err.message);
				},
				run: function(ctx) {
					ctx.n = 1;
					throw new Error('some');
				}
			});
			st.execute({}, function(err, ctx) {
				assert.equal(ctx.n, 1);
				assert.ifError(err);
				done();
			});
		});

		it('async', function(done) {
			var st = new Stage({
				rescue: function(err, ctx) {
					assert.equal('some', err.message);
				},
				run: function(ctx, done) {
					ctx.n = 1;
					throw new Error('some');
				}
			});
			st.execute({}, function(err, ctx) {
				assert.equal(ctx.n, 1);
				assert.ifError(err);
				done();
			});
		});

		it('async deep', function(done) {
			var st = new Stage({
				rescue: function(err, ctx) {
					assert.equal('some', err.message);
				},
				run: function(ctx, done) {
					ctx.n = 1;
					setImmediate(function() {
						throw new Error('some');
					});
				}
			});

			st.execute({}, function() {
				done();
			});
		});

	});

	it('do not handle Error it stage signature is (err, ctx, done)', function(done) {
		debugger;
		var flag = false;
		var st = new Stage({
			validate: function(ctx) {
				return false;
			},
			run: function(err, ctx, done) {
				flag = true;
				assert(err);
				done(err);
			}
		});
		st.execute({}, function(err, context) {
			assert(flag);
			assert(err);
			done();
		});
	});

	it('accepts name as config', function(done) {
		var name = 'new Name';
		var v = new Stage(name);
		assert(v.name == name);
		done();
	});


	it('can init with 2 or 3 parameters', function(done) {
		var v1 = new Stage({
			run: function newName1(ctx, done) {
				done();
			}
		});
		assert(v1.name == 'newName1');
		v1.execute({}, function(err, ctx) {
			done();
		});
	});

	it('accepts take function name as stage name', function(done) {
		var v0 = new Stage(function newName(err, ctx, done) {});
		assert(v0.name == 'newName');
		var v = new Stage({
			run: function newName(err, ctx, done) {}
		});
		assert(v.name == 'newName');
		done();
	});


	it('not allows to use constructor as a function', function(done) {
		try {
			var s = Stage();
		} catch (err) {
			done();
		}
	});

	it('runs within stage', function(done) {
		var s = new Stage(function(ctx, done) {
			assert.equal(this.someCode, 100);
			done();
		});
		s.someCode = 100;
		s.execute({}, function(err, ctx) {
			assert.ifError(err);
			done();
		});
	});

	/* deprecated context now is any js object
	it('converts context if it is not typeof Context in callback', function(done) {
		var stage = new Stage(function(err, context, done) {
			done();
		});

		stage.execute({}, function(err, ctx) {
			assert.equal(ctx instanceof Context, true);
			done();
		});
	});*/

	it('emits done', function(done) {
		var stage = new Stage(function(err, context, done) {
			done();
		});
		stage.execute({}, function() {
			assert.equal(!context, false);
			done();
		});
	});

	//	это не нужно, поскольку слишком сложная архитектура будет, все передавать через контекст
	// it('extra parameters to emit and to callback', function(done){
	// 	// сделать передачу дополнительных параметров в done, по принципу err, p1,p2,p3...
	// });

	it('emits error with context', function(done) {
		var stage = new Stage(function(err, context, done) {
			done(new Error());
		});

		stage.execute({}, function(err, ctx) {
			assert.equal(!err, false);
			assert.equal(!context, false);
			done();
		});
	});

	it('emits error if it configured to do so', function(done) {
		var stage = new Stage({
			run: function(err, context, done) {
				done(new Error());
			}
		});

		stage.execute({}, function(err, data) {
			assert.equal(!err, false);
			assert.equal(!context, false);
			done();
		});
	});

	it('can be traced with {trace:true}', function(done) {
		var stage = new Stage(function Some(err, context, done) {
			done();
		});
		stage.execute({
			trace: true
		}, function(err, data) {
			done();
		});
	});

	it('can be traced with {trace:true}', function(done) {
		var stage = new Stage(function Some(err, context, done) {
			done();
		});
		stage.execute({
			__trace: true
		}, function(err, data) {
			done();
		});
	});

	it('emits done if it configured to do so', function(done) {
		var stage = new Stage(function(err, context, done) {
			done();
		});

		stage.execute({}, function(err, data) {
			assert.equal(!context, false);
			done();
		});
	});

	it('prepare and finalize context');

	it('ensureContext', function(done) {
		debugger;
		var stage = new Stage(function(ctx) {
			ctx.done = 1;
		});
		var ensure = 0;
		stage.ensure = function(ctx, callback) {
			ensure++;
			callback(null, context);
		};
		stage.execute({}, function(err, ctx) {
			assert.equal(ensure, 1, 'ensure must called by default');
			assert.equal(ctx.done, 1, 'ensure must called by default');
			done();
		});
	});

	it('not run ensureContext if there is no run function', function(done) {
		var stage = new Stage();
		var ensure = 0;
		stage.ensure = function(ctx, callback) {
			ensure++;
			callback(null, context);
		};
		stage.execute({});
		assert.equal(ensure, 0);
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
		stage.execute(ctx, function(err) {
			// assert.equal(ctx.hasErrors(), true);
			assert.equal(/Error\: STG\: reports\: run is not a function/.test(err.toString()), true);
			done();
		});
	});

	it('stage with no run call callback with error', function(done) {
		var stage = new Stage();
		var ctx = new Context();
		stage.execute(ctx, function(err, context) {
			assert.equal(ctx, context);
			assert.equal(/Error\: STG\: reports\: run is not a function/.test(err.toString()), true);
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
			if (++l == 10) done();
		}

		function accept(err, data) {
			assert.equal(data.one, 2);
			gotit();
		}
		for (var i = 0; i < 10; i++) {
			var ctx1 = new Context({
				one: 1
			});
			st.execute(ctx1, accept);
		}
	});

	// it('addStage converts valid object structure to Stage', function(done){
	// });
});

describe('Context', function() {

	it('default empty', function(done) {
		var ctx = new Context();
		assert.equal(ctx.__parent === undefined, true, "MUST BE EMPTY");
		// assert.equal(ctx.__errors === undefined, true, "MUST BE EMPTY");
		assert.equal(ctx.__childs === undefined, true, "MUST BE EMPTY");
		done();
	});

	it('overwrite', function(done) {
		var c = new Context({
			some: 1,
			someOther: [1, 2, 3, 4, 5]
		});
		assert.equal(c.some, 1);
		assert.equal(c.someOther[0], 1);
		assert.equal(c.someOther.length, 5);
		c.overwrite({
			some: 2,
			thirdParty: 3
		});
		assert.equal(c.some, 2);
		assert.equal(c.thirdParty, 3);
		assert.equal(c.someOther[0], 1);
		assert.equal(c.someOther.length, 5);

		done();
	});

	it('get', function(done) {
		var c = new Context({
			embedded: {
				some: 1,
				someOther: [1, 2, 3, 4, 5],
				deep1: {
					other: [12, 23, 34],
					liter: "a"
				}
			},
			name: "test"
		});
		var ce = c.get('embedded');
		assert(ce instanceof Context);
		assert.equal(ce.some, 1);
		assert.equal(c.embedded.some, 1);
		assert.equal(ce.someOther, c.embedded.someOther);
		assert.equal(ce.deep1.liter, c.embedded.deep1.liter);
		ce.deep1.liter = "12345";
		assert.equal(ce.deep1.liter, c.embedded.deep1.liter);
		done();
	});

	it('clone context');
	// проверить все типы данных .... на клониноварие.
	// и на случай с вложенными контекстами тоже, когда через get выбираем часть
	it('toJSON context');

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
		assert.equal(ctx.config.some, ctx2.config.some, "MUST BE EQUAL");
		assert.equal(ctx.notConfig, ctx2.notConfig, "MUST BE EQUAL");
		assert.equal(ctx2.getParent() === ctx, true, "parent is context");
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
		var pipe = new Pipeline('defaultName');
		assert(pipe instanceof Stage);

		assert('defaultName' === pipe.name, 'name from config');
		assert.equal(!pipe.stages, false, 'default stage');
		assert.equal(pipe.stages.length, 0, 'nothing in stages');
		assert.equal(!pipe.run, true, 'default nothing to run');
		assert.doesNotThrow(function() {
			pipe.compile();
		}, 'must not throw when there is no stage to compile');
		pipe.execute({}, function(err, data) {
			assert(err == null);
			done();
		});
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
		assert.equal(pipe.stages[0] instanceof Stage, true);
		done();
	});

	it('catch throw errors', function(done) {
		var pipe = new Pipeline();
		pipe.addStage(function(err, ctx, done) {
			throw new Error('error');
		});
		pipe.execute({}, function(err, ctx) {
			assert.equal('error', err.message);
			done();
		});
	});

	it('rescue works', function(done) {
		var pipe = new Pipeline();
		var st = new Stage({
			run: function(err, ctx, done) {
				throw new Error('error');
			},
			rescue: function(err, conext) {
				if (err.message !== 'error')
					return err;
			}
		});
		pipe.addStage(st);
		pipe.execute({}, function(err, ctx) {
			assert.ifError(err);
			done();
		});
	});

	it('addStage take name of function or function body as stagename ', function(done) {
		var pipe = new Pipeline();
		pipe.addStage(function(err, ctx, done) {});
		pipe.addStage(function f1(err, ctx, done) {
			done();
		});
		assert.equal(pipe.stages[0].reportName(), 'STG: function (err, ctx, done) {}', 'function take function body as stage name');
		assert.equal(pipe.stages[1].reportName(), 'STG: f1', 'function take function name as stage name');
		done();
	});

	it('addStage converts function to Stage Instance', function(done) {
		var pipe = new Pipeline();
		pipe.addStage(function(err, ctx, done) {
			done();
		});
		assert.equal(pipe.stages[0] instanceof Stage, true, 'function is converted to Stage instance');
		done();
	});

	it('addStage converts object to Stage Instance', function(done) {
		var pipe = new Pipeline();
		pipe.addStage({
			run: function(err, ctx, done) {
				done();
			}
		});
		assert.equal(pipe.stages[0] instanceof Stage, true, 'function is converted to Stage instance');
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
		assert.equal(pipe.stages[0] instanceof Stage, true, 'function is converted to Stage instance');
		assert.equal(pipe.stages[1] instanceof Stage, true, 'function is converted to Stage instance');
		done();
	});

	it('accept empty addStages', function(done) {
		var pipe = new Pipeline();
		pipe.addStage();
		assert.equal(pipe.stages.length, 0, 'any stage found');
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
		pipe.ensure = function(ctx, callback) {
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
			assert.ifError(err);
			assert.equal(1, ctx.item);
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

		pipe.execute(ctx1, function(err) {
			assert.equal(err, error);
			// assert.equal(ctx1.hasErrors(), true, 'must has errors 1');
			// assert.equal(ctx1.getErrors()[0] == error, true, 'must has error 2');
			assert.equal(ctx1.s1, true, 's1 pass');
			assert.equal(ctx1.s2, true, 's2 pass');
			assert.equal(ctx1.s3, false, 's3 not passed');
			done();
		});
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
			ensure: function WV(context, callback) {
				if (context.SomeValue !== 1) callback(new Error(this.reportName() + ': Wrong Value'));
				else callback(null, context);
			},
			run: undefined // so it will be 0
		};
		var s2 = new Stage(stage2);
		pipe.addStage(s2);
		pipe.execute(ctx, function(err) {
			assert.equal(/Error: STG: 0 reports: run is not a function/.test(err.toString()), true);
			done();
		});
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

	it('use schema to override validate with object', function(done) {
		var type1 = {
			some: Object,
			other: String
		};
		var stg = new Stage({
			schema: type1
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
		stg.execute(ctx, function() {
			done();
		});
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

		stg.execute(ctx, function(err) {
			if (err) {
				done();
			}
		});
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
		debugger;
		var pipe = new Pipeline();

		pipe.addStage(function(context, done) {
			process.nextTick(function() {
				context.one++;
				done();
			});
		});

		pipe.addStage(function(context, done) {
			process.nextTick(function() {
				context.one += 1;
				done();
			});
		});

		pipe.addStage(function(context, done) {
			context.one += 5;
			done();
		});

		var l = 0;

		function gotit() {
			if (++l == 10) done();
		}
		for (var i = 0; i < 10; i++) {
			(function() {
				var ctx1 = new Context({
					one: 1
				});
				pipe.execute(ctx1, function(err, data) {
					assert.equal(data.one, 8);
					gotit();
				});
			})();
		}
	});
});

describe('Sequential', function() {
	it('works with default', function(done) {
		var stage = new Sequential();
		assert(stage instanceof Stage);
		stage.execute({}, function(err, context) {
			assert.ifError(err);
			done();
		});

	});

	it('rescue', function(done) {
		var st = new Stage({
			run: function(err, ctx, done) {
				throw new Error('error');
			},
			rescue: function(err, conext) {
				if (err.message !== 'some')
					return err;
			}
		});

		var stage = new Sequential({
			stage: st,
			rescue: function(err, conext) {
				if (err.errors[0].err.message !== 'error')
					return err;
			}
		});

		stage.execute({}, function(err, ctx) {
			assert.ifError(err);
			done();
		});
	});

	it('works with config as Stage', function(done) {
		var stage = new Sequential(new Stage(function(err, ctx, done) {
			done();
		}));
		stage.execute({}, function(err, context) {
			// assert.equal(context instanceof Context, true);
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
		var stage0 = new Stage(function(ctx) {
			ctx.iter++;
		});
		var stage = new Sequential({
			stage: stage0,
			split: function(ctx) {
				ctx.split = [0, 0, 0, 0, 0];
				ctx.split = ctx.split.map(function(i) {
					return {
						iter: 0
					};
				});
				return ctx.split;
			},
			combine: function(ctx, children) {
				ctx.iter = children.reduce(function(p, c, i, a) {
					return p + c.iter;
				}, 0);
				delete ctx.split;
				return ctx;
			}
		});
		stage.execute({}, function(err, context) {
			assert.equal(context.iter, 5);
			done();
		});
	});

	it('empty split not run combine', function(done) {
		var stage0 = new Stage(function(ctx) {});
		var stage = new Sequential({
			stage: stage0,
			split: function(ctx) {
				return [];
			},
			combine: function(ctx, children) {
				ctx.combine = true;
				return ctx;
			}
		});
		stage.execute({}, function(err, context) {
			assert.equal(!context.combine, true);
			done();
		});
	});

	it('prepare context -> moved to Wrap', function(done) {
		var stage0 = new Stage(function(ctx) {
			ctx.iteration++;
		});
		var stage = new Wrap({
			prepare: function(ctx) {
				return {
					iteration: ctx.iter
				};
			},
			finalize: function(ctx, retCtx) {
				ctx.iter = retCtx.iteration;
			},
			stage: new Sequential({
				stage: stage0,
				split: function(ctx) {
					ctx.split = [0, 0, 0, 0, 0];
					ctx.split = ctx.split.map(function(i) {
						return {
							iteration: 0
						};
					});
					return ctx.split;
				},
				combine: function(ctx, children) {
					ctx.iteration = children.reduce(function(p, c, i, a) {
						return p + c.iteration;
					}, 0);
					delete ctx.split;
					return ctx;
				}
			})
		});

		stage.execute({
			iter: 0
		}, function(err, context) {
			assert.ifError(err);
			assert.equal(context.iter, 5);
			assert.ifError(context.iteration);
			done();
		});
	});

});

describe('Parallel', function() {
	it('works with default', function(done) {
		var stage = new Parallel();
		assert(stage instanceof Stage);
		stage.execute({}, function(err, context) {
			assert.ifError(err);
			// assert.equal(context instanceof Context, true);
			done();
		});
	});

	it('accept config', function(done) {
		var st = new Stage();
		var pp = new Parallel(st);
		assert(st === pp.stage);
		done();
	});

	it('accept config', function(done) {
		var st = function(err, ctx, done) {};
		var pp = new Parallel({
			stage: st
		});
		assert(st === pp.stage.run);
		done();
	});

	it('not used without construction', function(done) {
		assert.throws(function() {
			Parallel();
		});
		done();
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

	it('empty split not run combine', function(done) {
		var stage0 = new Stage(function(ctx) {});
		var stage = new Parallel({
			stage: stage0,
			split: function(ctx) {
				return [];
			},
			combine: function(ctx, children) {
				ctx.combine = true;
				return ctx;
			}
		});

		stage.execute({}, function(err, context) {
			assert.equal(!context.combine, true);
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
			if (ctx.some == 4) done(new Error("4"));
			else if (ctx.some == 5) done(new Error("5"));
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
			combine: function(ctx, childs) {
				var len = childs.length;
				ctx.result = 0;
				for (var i = 0; i < len; i++) {
					ctx.result += childs[i].liter;
				}
			}
		});
		stage.execute(ctx, function(err, context) {
			assert.equal(err instanceof Error, true);
			assert.equal(err.errors.length, 2);
			assert.equal(!context.result, true);
			done();
		});
	});

	it('complex example 2', function(done) {
		var stage0 = new Stage(function(err, ctx, done) {
			ctx.liter = 1;
			done();
		});
		var ctx = new Context({
			some: [1, 2, 3, 4, 5, 6, 7]
		});
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
			combine: function(ctx, children) {
				var childs = children;
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
		assert(stage instanceof Stage);
		stage.execute({}, function(err, context) {
			// assert.equal(context instanceof Context, true);
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

	it('simple works sucess as function', function(done) {
		var s0 = function(err, ctx, done) {
			ctx.done = true;
			done();
		};
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

	it('simple works failed', function(done) {
		var s0 = function(err, ctx, done) {
			ctx.done = true;
			done();
		};

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

describe('Wrap', function() {
	it('works', function(done) {
		var st1 = new Stage({
			run: function(ctx) {
				ctx.count++;
				ctx.name = 'borrow';
			}
		});
		var wr = new Wrap({
			stage: st1,
			prepare: function(ctx) {
				var retCtx = {
					name: ctx.FullName,
					count: ctx.Retry
				};
				return retCtx;
			},
			finalize: function(ctx, retCtx) {
				ctx.Retry = retCtx.count;
				return ctx;
			}
		});
		var ctx = new Context({
			FullName: 'NEO',
			Retry: 1
		});
		wr.execute(ctx, function(err, retCtx) {
			assert(!err);
			assert(ctx.Retry === 2);
			assert(ctx === retCtx);
			done();
		});
	});
});

describe('Timeout', function() {
	it('not used without construction', function(done) {
		assert.throws(function() {
			Timeout(123);
		});
		done();
	});

	it('not can be used  without confg', function(done) {
		assert.doesNotThrow(function() {
			var t = new Timeout();
		});
		assert((new Timeout()) instanceof Stage);
		done();
	});


	it('works', function(done) {
		var to = new Timeout(function(err, ctx, done) {
			done();
		});
		to.execute({}, function(err, ctx) {
			done();
		});
	});

	it('accept stage instances', function(done) {
		var stg = new Stage(function(err, ctx, done) {
			done();
		});
		var to = new Timeout(stg);
		to.execute({}, function(err, ctx) {
			done();
		});
	});

	it('accepts use default overdue', function(done) {
		var to = new Timeout({
			timeout: 100,
			stage: new Stage(function(err, ctx, done) {
				setTimeout(function() {
					done();
				}, 10000);
			})
		});
		to.execute({}, function(err, ctx) {
			assert.ok(err);
			done();
		});
	});

	it('timeout can be a function!', function(done) {
		var to = new Timeout({
			timeout: function(ctx) {
				return ctx.to;
			},
			stage: new Stage(function(err, ctx, done) {
				setTimeout(function() {
					done();
				}, 10000);
			})
		});
		to.execute({
			to: 1000
		}, function(err, ctx) {
			assert.ok(err);
			done();
		});
	});

	it('accepts Stages in config', function(done) {
		var to = new Timeout({
			stage: new Stage(function(err, ctx, done) {
				done();
			}),
			overdue: new Stage(function(err, ctx, done) {
				done();
			})
		});
		to.execute({}, function(err, ctx) {
			done();
		});
	});

	it('overdue called', function(done) {
		var to = new Timeout({
			timeout: 100,
			stage: function(err, ctx, done) {
				setTimeout(function() {
					done();
				}, 10000);
			},
			overdue: function(err, ctx, done) {
				ctx.overdue = true;
				done();
			}

		});
		to.execute({}, function(err, ctx) {
			assert.equal(ctx.overdue, true);
			done();
		});
	});
});

describe('RetryOnError', function() {

	it('works', function(done) {
		var st = new RetryOnError({
			run: function(ctx) {
				ctx.works = true;
			}
		});
		st.execute({}, function(err, ctx) {
			assert.ifError(err);
			assert(ctx.works);
			done();
		});
	});

	it('retry works once by default', function(done) {
		var iter = 0;
		var st = new RetryOnError({
			run: function(ctx) {
				ctx.works = true;
				if (iter == 0) {
					iter++;
					throw new Error('error');
				}
			}
		});
		st.execute({}, function(err, ctx) {
			assert.ifError(err);
			assert(ctx.works);
			assert.equal(iter, 1);
			done();
		});
	});

	it('retry use custom restore and backup', function(done) {
		var iter = -1;
		var st = new RetryOnError({
			run: function(ctx) {
				ctx.works = true;
				if (iter++ < 3) {
					throw new Error('error');
				}
			},
			retry: 4,
			backup: function(ctx) {
				ctx.backup++;
				return {
					works: ctx.works
				};
			},
			restore: function(ctx, backup) {
				ctx.restore++;
				ctx.works = backup.works;
			}
		});
		st.execute({
			works: false,
			backup: 0,
			restore: 0
		}, function(err, ctx) {
			assert.ifError(err);
			assert(ctx.works);
			assert.equal(iter, 4);
			assert.equal(ctx.backup, 1);
			assert.equal(ctx.restore, 4);
			done();
		});
	});


	it('retry works with rescue', function(done) {
		var st = new RetryOnError({
			rescue: function(err, ctx) {
				if (err.message !== 'error') return err;
				ctx.rescue = true;
			},
			run: function(ctx) {
				throw new Error('error');
			}
		});
		st.execute({}, function(err, ctx) {
			assert.ifError(err);
			assert.ifError(ctx.works);
			assert(ctx.rescue);
			done();
		});
	});

	it('retry works as function', function(done) {
		var iter = 0;
		var st = new RetryOnError({
			retry: function(err, ctx, iter) {
				return err.message === 'error'
			},
			run: function(ctx) {
				if (iter == 0) {
					iter++;
					throw new Error('error');
				}
				ctx.works = true;
			}
		});
		st.execute({}, function(err, ctx) {
			assert.ifError(err);
			assert(ctx.works);
			assert.equal(iter, 1);
			done();
		});
	});

	it('retry works as number', function(done) {
		var iter = 0;
		var st = new RetryOnError({
			retry: 1,
			run: function(ctx) {
				if (iter == 0) {
					iter++;
					throw new Error('error');
				}
				ctx.works = true;
			}
		});
		st.execute({}, function(err, ctx) {
			assert.ifError(err);
			assert(ctx.works);
			assert.equal(iter, 1);
			done();
		});
	});

});

describe('MWS', function() {

	it('works', function(done) {
		var sw = new MultiWaySwitch();
		assert(sw instanceof Stage);
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
		var pipe0 = new Pipeline([

			function(err, ctx, done) {
				ctx.p00 = true;
				cnt++;
				done();
			},
			function(err, ctx, done) {
				ctx.p01 = true;
				cnt++;
				done();
			}
		]);
		var pipe1 = new Pipeline([

			function(err, ctx, done) {
				ctx.p10 = true;
				cnt++;
				done();
			},
			function(err, ctx, done) {
				ctx.p11 = true;
				cnt++;
				done();
			}
		]);
		var pipe2 = new Pipeline({
			stages: [

				function(err, ctx, done) {
					ctx.p20 = true;
					cnt++;
					done();
				},
				function(err, ctx, done) {
					ctx.p21 = true;
					cnt++;
					done();
				}
			]
		});

		var sw = new MultiWaySwitch([pipe0, pipe1, pipe2]);
		sw.execute({}, function(err, ctx) {
			assert.equal(6, cnt);
			done();
		});
	});

	it('use trace', function(done) {
		var sw = new MultiWaySwitch({
			cases: [{
				stage: function(err, ctx, done) {
					done();
				},
				evaluate: function() {
					return true;
				},
				split: function(ctx) {
					return ctx.fork();
				}
			}, {
				stage: {
					run: function(err, ctx, done) {
						done();
					}
				},
				evaluate: function() {
					return true;
				},
				split: function(ctx) {
					return ctx.fork();
				}
			}]
		});

		sw.execute({
			trace: true
		}, function(err, ctx) {
			done();
		});
	});

	it('use defaults condition as object', function(done) {
		var sw = new MultiWaySwitch({
			cases: [{
				stage: function(err, ctx, done) {
					done();
				},
				evaluate: function() {
					return true;
				}
			}, {
				stage: {
					run: function(err, ctx, done) {
						done();
					}
				},
				evaluate: function() {
					return true;
				}
			}]
		});

		sw.execute({}, function(err, ctx) {
			done();
		});
	});

	it('must enter in each pipe works in parallel', function(done) {
		var pipe0 = new Pipeline([

			function(err, ctx, done) {
				ctx.cnt = 1;
				done();
			},
			function(err, ctx, done) {
				ctx.cnt += 1;
				done();
			}
		]);
		var pipe1 = new Pipeline([

			function(err, ctx, done) {
				ctx.cnt = 1;
				done();
			},
			function(err, ctx, done) {
				ctx.cnt += 1;
				done();
			}
		]);

		var sw = new MultiWaySwitch({
			cases: [pipe0, pipe1],
			split: function(ctx) {
				return ctx.fork();
			},
			combine: function(ctx, retCtx) {
				ctx.size += retCtx.cnt;
			}
		});
		sw.execute(new Context({
					size: 0
				}), function(err, ctx) {
			assert.equal(ctx.size, 4);
			done();
		});
	});

	it('exception errors for', function(done) {
		var pipe0 = new Pipeline([

			function(err, ctx, done) {
				ctx.cnt = 1;
				done();
			},
			function(err, ctx, done) {
				ctx.cnt += 1;
				done(new Error());
			}
		]);
		var pipe1 = new Pipeline([

			function(err, ctx, done) {
				ctx.cnt = 1;
				done();
			},
			function(err, ctx, done) {
				ctx.cnt += 1;
				done();
			}
		]);

		var sw = new MultiWaySwitch({
			cases: [pipe0, pipe1],
			split: function(ctx) {
				return ctx.fork();
			},
			combine: function(ctx, retCtx) {
				ctx.size += retCtx.cnt;
			}
		});
		sw.execute(new Context({
					size: 0
				}), function(err, ctx) {
			assert.equal(ctx.size, 2);
			debugger;
			assert.equal(err instanceof Error, true);
			done();
		});
	});

	it('exception errors for 2', function(done) {
		var pipe0 = new Pipeline([

			function(err, ctx, done) {
				ctx.cnt = 1;
				done();
			},
			function(err, ctx, done) {
				ctx.cnt += 1;
				done();
			}
		]);
		var pipe1 = new Pipeline([

			function(err, ctx, done) {
				ctx.cnt = 1;
				done(new Error());
			},
			function(err, ctx, done) {
				ctx.cnt += 1;
				done();
			}
		]);

		var sw = new MultiWaySwitch({
			cases: [pipe0, pipe1],
			split: function(ctx) {
				return ctx.fork();
			},
			combine: function(ctx, retCtx) {
				ctx.size += retCtx.cnt;
			},
			rescue: function(err, ctx) {
				return err;
			}
		});
		sw.execute(new Context({
					size: 0
				}), function(err, ctx) {
			assert.equal(ctx.size, 2);
			assert.equal(err instanceof Error, true);
			done();
		});
	});

	it('rescue work as expected 1 ', function(done) {
		var pipe0 = new Pipeline([

			function(ctx) {
				ctx.cnt = 1;
			},
			function(ctx) {
				ctx.cnt += 1;
			}
		]);

		var pipe1 = new Pipeline({
			rescue: function(err, ctx) {
				return;
			},
			stages: [

				function(ctx) {
					ctx.cnt = 1;
				},
				function(ctx, done) {
					ctx.cnt += 1;
					done('error');
				}
			]
		});

		var sw = new MultiWaySwitch({
			cases: [pipe0, pipe1],
			split: function(ctx) {
				return ctx.fork();
			},
			combine: function(ctx, retCtx) {
				ctx.size += retCtx.cnt;
			}
		});
		sw.execute(new Context({
					size: 0
				}), function(err, ctx) {
			assert.equal(ctx.size, 4);
			assert.ifError(err);
			done();
		});
	});

	it('rescue work as expected 2', function(done) {
		var pipe0 = new Pipeline([

			function(ctx) {
				ctx.cnt = 1;
			},
			function(ctx) {
				ctx.cnt += 1;
			}
		]);
		// THIS STAGE WILL BE FAILED
		var pipe1 = new Pipeline([

			function(ctx) {
				ctx.cnt = 1;
			},
			function(ctx, done) {
				ctx.cnt += 1;
				done(new Error('error'));
			}
		]);

		var sw = new MultiWaySwitch({
			cases: [pipe0, pipe1],
			split: function(ctx) {
				return ctx.fork();
			},
			combine: function(ctx, retCtx) {
				ctx.size += retCtx.cnt;
			},
			rescue: function(err, ctx) {
				return;
			},
		});
		sw.execute(new Context({
					size: 0
				}), function(err, ctx) {
			assert.equal(ctx.size, 2);
			assert.ifError(err);
			done();
		});
	});

	it('not evaluate if missing evaluate property only if they are strongly evaluate = false', function(done) {
		var pipe0 = new Pipeline([

			function(err, ctx, done) {
				ctx.cnt = 1;
				done();
			},
			function(err, ctx, done) {
				ctx.cnt += 1;
				done();
			}
		]);
		var pipe1 = new Pipeline({
			rescue: function() {
				return false;
			},
			stages: [

				function(err, ctx, done) {
					ctx.cnt = 1;
					done();
				},
				function(err, ctx, done) {
					ctx.cnt += 1;
					done(new Error('error'));
				}
			]
		});

		var sw = new MultiWaySwitch({
			cases: [pipe0, {
				stage: pipe1,
				evaluate: false
			}],
			split: function(ctx) {
				return ctx.fork();
			},
			combine: function(ctx, retCtx) {
				ctx.size += retCtx.cnt;
			}
		});
		sw.execute(new Context({
					size: 0
				}), function(err, ctx) {
			assert.equal(ctx.size, 2);
			assert.ifError(err);
			done();
		});
	});

	it('evaluate if missing evaluate property', function(done) {
		var pipe0 = new Pipeline([
			function(err, ctx, done) {
				ctx.cnt = 1;
				done();
			},
			function(err, ctx, done) {
				ctx.cnt += 1;
				done();
			}
		]);
		var pipe1 = new Pipeline({
			rescue: function() {
				return false;
			},
			stages: [

				function(err, ctx, done) {
					ctx.cnt = 1;
					done();
				},
				function(err, ctx, done) {
					ctx.cnt += 1;
					done(new Error('error'));
				}
			]
		});

		var sw = new MultiWaySwitch({
			cases: [pipe0, {
				stage: pipe1
			}],
			split: function(ctx) {
				return ctx.fork();
			},
			combine: function(ctx, retCtx) {
				ctx.size += retCtx.cnt;
			}
		});
		sw.execute(new Context({
			size: 0
		}), function(err, ctx) {
			assert.equal(ctx.size, 4);
			assert.ifError(err);
			done();
		});
	});

	it('individual exception handler work', function(done) {
		var pipe0 = new Pipeline([

			function(err, ctx, done) {
				ctx.cnt = 1;
				done();
			},
			function(err, ctx, done) {
				ctx.cnt += 1;
				done();
			}
		]);
		var pipe1 = new Pipeline({
			rescue: function() {
				return false;
			},
			stages: [

				function(err, ctx, done) {
					ctx.cnt = 1;
					done();
				},
				function(err, ctx, done) {
					ctx.cnt += 1;
					done(new Error());
				}
			]
		});

		var sw = new MultiWaySwitch({
			cases: [pipe0, {
				stage: pipe1,
				evaluate: true
			}],
			split: function(ctx) {
				return ctx.fork();
			},
			combine: function(ctx, retCtx) {
				ctx.size += retCtx.cnt;
			}
		});
		sw.execute(new Context({
			size: 0
		}), function(err, ctx) {
			assert.equal(ctx.size, 4);
			assert.ifError(err);
			done();
		});
	});

	it('empty split run combine', function(done) {
		var stage0 = new Stage(function(ctx) {});
		var stage = new MultiWaySwitch({
			cases: [stage0],
			split: function(ctx) {
				return [];
			},
			combine: function(ctx, children) {
				ctx.combine = true;
				return ctx;
			}
		});
		stage.execute({}, function(err, context) {
			assert.equal(context.combine, true);
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
			assert.ifError(err);
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
			assert.ifError(err);
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

describe("Complex", function() {
	describe("throwing exceptoins", function() {
		it("pipelie + stages", function(done) {
			var pipe = new Pipeline();
			pipe.addStage(new Stage({
				run: function(ctx) {
					ctx.step1 = true;
				}
			}));
			pipe.addStage(new Pipeline({
				rescue: function(err, ctx) {
					if (err.message !== 'error') return err;
					ctx.rescue1 = true;
				},
				stages: [
					new Stage({
						run: function() {
							this.step2 = true;
						}
					}),
					new Stage({
						run: function(ctx) {
							throw new Error('error');
						}
					}),
					new Stage({
						run: function(ctx) {
							ctx.step3 = true;
						}
					})
				]
			}));
			pipe.addStage(new Stage({
				run: function(ctx) {
					ctx.step4 = true;
				}
			}));

			pipe.addStage(new IfElse({
				failed: new Stage({
					name: "failure",
					rescue: function(err, ctx) {
						if (err.message !== 'error') return err;
						ctx.rescue2 = true;
					},
					run: function() {
						throw new Error('error');
					}
				}),
				success: new Stage(function() {}),
				condition: function() {
					return false;
				}
			}));

			pipe.addStage(new IfElse({
				rescue: function(err, ctx) {
					if (err.message !== 'error') return err;
					ctx.rescue3 = true;
				},
				failed: new Stage({
					run: function() {
						throw new Error('error');
					}
				}),
				success: new Stage(function() {}),
				condition: function() {
					return false;
				}
			}));

			pipe.addStage(new Wrap({
				rescue: function(err, ctx) {
					if (err.message !== 'error') return err;
					ctx.rescue4 = true;
				},
				stage: new Stage({
					run: function(ctx) {
						throw new Error('error');
					}
				})
			}));

			pipe.execute({}, function(err, ctx) {
				assert.ifError(err);
				assert(ctx.step1);
				assert(ctx.step2);
				assert(ctx.rescue1);
				assert(ctx.rescue2);
				assert(ctx.rescue3);
				assert(ctx.rescue4);
				assert.ifError(ctx.step3);
				assert(ctx.step4);
				done();
			});
		});
	});
});


describe('DoWhile', function() {
	it('works with default', function(done) {
		var stage = new DoWhile();
		assert(stage instanceof Stage);
		stage.execute({}, function(err, context) {
			assert.ifError(err);
			// assert.equal(context instanceof Context, true);
			done();
		});

	});

	it('rescue', function(done) {
		var pipe = new Pipeline();
		var st = new Stage({
			run: function(err, ctx, done) {
				throw new Error('error');
			},
			rescue: function(err, conext) {
				if (err.message !== 'error')
					return err;
			}
		});
		pipe.addStage(st);
		pipe.execute({}, function(err, ctx) {
			assert.ifError(err);
			done();
		});
	});

	it('works with config as Stage', function(done) {
		var stage = new DoWhile(new Stage(function(err, ctx, done) {
			done();
		}));
		stage.execute({}, function(err, context) {
			// assert.equal(context instanceof Context, true);
			done();
		});
	});

	it('works with config as Stage', function(done) {
		var stage = new DoWhile({
			stage: function(err, ctx, done) {
				done();
			}
		});
		stage.execute({}, function(err, context) {
			// assert.equal(context instanceof Context, true);
			done();
		});
	});

	it('not allows to use constructor as a function', function(done) {
		try {
			var s = DoWhile();
		} catch (err) {
			done();
		}
	});
	it('run stage', function(done) {
		var stage0 = new Stage(function(err, ctx, done) {
			ctx.iter++;
			done();
		});
		var stage = new DoWhile({
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

	it('prepare context -> moved to Wrap', function(done) {
		var stage0 = new Stage(function(ctx) {
			ctx.iteration++;
		});
		var stage = new Wrap({
			prepare: function(ctx) {
				return {
					iteration: ctx.iter
				};
			},
			finalize: function(ctx, retCtx) {
				ctx.iter = retCtx.iteration;
			},
			stage: new DoWhile({
				stage: stage0,
				split: function(ctx, iter) {
					return ctx;
				},
				reachEnd: function(err, ctx, iter) {
					return err || iter == 10;
				}
			})
		});

		stage.execute({
			iter: 0
		}, function(err, context) {
			assert.equal(context.iter, 10);
			assert.ifError(context.iteration);
			done();
		});
	});

	it('complex example 1', function(done) {
		var stage0 = new Stage({
			run: function(ctx) {
				result++;
			}
		});
		var ctx = {
			some: [1, 2, 3, 4, 5, 6, 7]
		};
		var len = ctx.some.length;
		var result = 0;
		var stage = new DoWhile({
			stage: stage0,
			reachEnd: function(err, ctx, iter) {
				return err || iter == len;
			}
		});

		stage.execute(ctx, function(err, context) {
			assert.equal(result, 7);
			done();
		});
	});

	it('complex example 1 error handling', function(done) {
		var stage0 = new Stage({
			run: function(ctx, done) {
				ctx.liter = 1;
				if (ctx.iter === 4) done(new Error());
				else done();
			}
		});
		var ctx = {
			some: [1, 2, 3, 4, 5, 6, 7]
		};
		var len = ctx.some.length;
		var stage = new DoWhile({
			stage: stage0,
			split: function(ctx, iter) {
				return {
					iter: ctx.some[iter]
				};
			},
			reachEnd: function(err, ctx, iter) {
				return err || iter == len;
			}
		});

		stage.execute(ctx, function(err, context) {
			assert.equal(!context.result, true);
			done();
		});
	});

	it('cheks context as well', function(done) {
		var stage0 = new Stage({
			validate: function(ctx) {
				if (ctx.iter > 5) return new Error('error');
				return true;
			},
			run: function(ctx, done) {
				ctx.liter = 1;
				done();
			}
		});
		var ctx = {
			some: [1, 2, 3, 4, 5, 6, 7]
		};
		var len = ctx.some.length;
		var stage = new DoWhile({
			stage: stage0,
			split: function(ctx, iter) {
				return {
					iter: ctx.some[iter]
				};
			},
			reachEnd: function(err, ctx, iter) {
				return err || iter == len;
			}
		});
		stage.execute(ctx, function(err, context) {
			assert.equal(err.message, "error");
			done();
		});
	});
});

describe('Empty', function() {
	it('Works', function(done) {
		var stg = new Empty();
		stg.execute({}, function(err, ctx) {
			assert(!err);
			done()
		});
	});
});
// продумать то, как работает код!! с разными Stage
// rescue! как его использовать в MWS
// rescue! как его использовать в Sequential
// rescue! как его использовать в Parallel
// rescue! как его использовать в Timeout
// rescue! как его использовать в Wrap