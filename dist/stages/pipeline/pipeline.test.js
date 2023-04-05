"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("jest");
const types_1 = require("../../stage/context/types");
const pipeline_1 = require("./pipeline");
const stage_1 = require("../../stage");
const types_2 = require("../utils/types");
const ErrorList_1 = require("../../stage/errors/ErrorList");
describe('Pipeline', function () {
    it('defaults', function (done) {
        var pipe = new pipeline_1.Pipeline('defaultName');
        expect(pipe).toBeInstanceOf(stage_1.Stage);
        expect('defaultName' === pipe.name).toBeTruthy();
        expect(pipe.config.stages.length).toEqual(0);
        expect(!pipe.run).toEqual(true);
        expect(function () {
            pipe.compile();
        }).not.toThrow();
        pipe.execute({}, function (err, data) {
            expect(err == null).toBeTruthy();
            done();
        });
    });
    it('not allows to use constructor as a function', function (done) {
        try {
            var s = (0, pipeline_1.Pipeline)();
        }
        catch (err) {
            done();
        }
    });
    it('addStage', function (done) {
        var pipe = new pipeline_1.Pipeline();
        pipe.addStage(new stage_1.Stage());
        expect(pipe.config.stages.length).toEqual(1);
        expect((0, types_2.isAnyStage)(pipe.config.stages[0])).toEqual(true);
        done();
    });
    it('catch throw errors 1', function (done) {
        var pipe = new pipeline_1.Pipeline();
        pipe.addStage(function (ctx, done) {
            throw new Error('error');
        });
        pipe.execute({}, function (err, ctx) {
            if (err instanceof ErrorList_1.ComplexError)
                expect('error').toEqual((err === null || err === void 0 ? void 0 : err.payload)[0].message);
            done();
        });
    });
    it('catch throw errors 2', function (done) {
        var pipe = new pipeline_1.Pipeline([
            function (err, ctx, done) {
                ctx.cnt = 1;
                done(new Error('error'));
            },
            function (err, ctx, done) {
                ctx.cnt += 1;
                done();
            },
        ]);
        pipe.execute({}, function (err, ctx) {
            if (err instanceof ErrorList_1.ComplexError)
                expect('error').toEqual((err === null || err === void 0 ? void 0 : err.payload)[0].message);
            done();
        });
    });
    it('catch throw errors 3', function (done) {
        var pipe = new pipeline_1.Pipeline({
            rescue: function (err) {
                if ((err === null || err === void 0 ? void 0 : err.message) == 'error')
                    return false;
            },
            stages: [
                function (err, ctx, done) {
                    ctx.cnt = 1;
                    done();
                },
                function (err, ctx, done) {
                    ctx.cnt += 1;
                    done(new Error('error'));
                },
            ],
        });
        pipe.execute({}, function (err, ctx) {
            expect(err).toBeUndefined();
            expect(ctx.cnt).toEqual(2);
            done();
        });
    });
    it('rescue works', function (done) {
        var pipe = new pipeline_1.Pipeline();
        var st = new stage_1.Stage({
            run: function (err, ctx, done) {
                throw new Error('error');
            },
            rescue: function (err, conext) {
                if (err.payload[0].message !== 'error') {
                    return err;
                }
            },
        });
        pipe.addStage(st);
        pipe.execute({}, function (err, ctx) {
            expect(err == null).toBeTruthy();
            done();
        });
    });
    it('addStage converts function to Stage Instance', function (done) {
        var pipe = new pipeline_1.Pipeline();
        pipe.addStage(function (err, ctx, done) {
            done();
        });
        expect(pipe.config.stages[0] instanceof Function).toBeTruthy();
        done();
    });
    it('addStage converts object to Stage Instance', function (done) {
        var pipe = new pipeline_1.Pipeline();
        pipe.addStage({
            run: function (err, ctx, done) {
                done();
            },
        });
        expect((0, types_2.isAnyStage)(pipe.config.stages[0])).toBeTruthy();
        done();
    });
    it('accept array of stages', function (done) {
        var f1 = function (err, ctx, done) {
            done();
        };
        var f2 = function (err, ctx, done) {
            done();
        };
        var pipe = new pipeline_1.Pipeline([f1, f2]);
        pipe.addStage(function (err, ctx, done) {
            done();
        });
        expect(pipe.config.stages[0] instanceof Function).toBeTruthy();
        expect(pipe.config.stages[1] instanceof Function).toBeTruthy();
        done();
    });
    it('accept empty addStages', function (done) {
        var pipe = new pipeline_1.Pipeline();
        pipe.addStage();
        expect(pipe.config.stages.length).toEqual(0);
        done();
    });
    it('compile', function (done) {
        var pipe = new pipeline_1.Pipeline();
        pipe.addStage(new stage_1.Stage());
        pipe.compile();
        expect(typeof pipe.run == 'function').toBeTruthy();
        pipe.addStage(new stage_1.Stage());
        expect(!pipe.run).toBeTruthy();
        done();
    });
    it('execute must call compile and ensure', function (done) {
        let ensure = 0;
        let compile = 0;
        let pipe = new pipeline_1.Pipeline({
            precompile: () => {
                compile++;
            },
            ensure: function (ctx, callback) {
                ensure++;
                callback();
            },
        });
        pipe.addStage(new stage_1.Stage(function (err, context, done) {
            done();
        }));
        pipe.execute({}, (err, ctx) => {
            expect(ensure).toEqual(1);
            expect(compile).toEqual(1);
            done();
        });
    });
    it('executes pipes in pipes', function (done) {
        var pipe = new pipeline_1.Pipeline();
        var nestedpipe = new pipeline_1.Pipeline();
        nestedpipe.addStage(function (err, ctx, done) {
            ctx.item = 1;
            done();
        });
        pipe.addStage(nestedpipe);
        pipe.execute({
            item: 0,
        }, function (err, ctx) {
            expect(err).toBeUndefined();
            expect(1).toEqual(ctx === null || ctx === void 0 ? void 0 : ctx.item);
            done();
        });
    });
    it('context catch all errors', function (done) {
        var pipe = new pipeline_1.Pipeline();
        var ctx1 = types_1.Context.create({
            s1: false,
            s2: false,
            s3: false,
        });
        var error = new Error('THE ERROR');
        var s1 = new stage_1.Stage(function (context, done) {
            expect(context).toEqual(ctx1);
            context.s1 = true;
            done();
        });
        var s2 = new stage_1.Stage(function (context, done) {
            expect(context).toEqual(ctx1);
            context.s2 = true;
            done(error);
        });
        var s3 = new stage_1.Stage(function (context, done) {
            context.s3 = true;
            done(new Error('another ERROR'));
        });
        pipe.addStage(s1);
        pipe.addStage(s2);
        pipe.addStage(s3);
        pipe.execute(ctx1, function (err, ctx) {
            expect(err === null || err === void 0 ? void 0 : err.payload[0]).toEqual(error);
            expect(ctx1.get('s1')).toEqual(true);
            expect(ctx1.get('s2')).toEqual(true);
            expect(ctx1.get('s3')).toEqual(false);
            done();
        });
    });
    it('ensure Context Error use', function (done) {
        var ctx = { SomeValue: 1 };
        var pipe = new pipeline_1.Pipeline();
        var error = new Error('context not ready');
        pipe.addStage(new stage_1.Stage({
            run: function (err, context, done) {
                context.SomeValue += 1;
                done();
            },
            ensure: function (context, callback) {
                if (context.SomeValue !== 1)
                    callback(error);
                else
                    callback(null, context);
            },
        }));
        var stage2 = {
            ensure: function WV(context, callback) {
                if (context.SomeValue !== 1) {
                    callback(new Error(': Wrong Value'));
                }
                else
                    callback(null, context);
            },
            run: undefined,
        };
        var s2 = new stage_1.Stage(stage2);
        pipe.addStage(s2);
        pipe.execute(ctx, function (err) {
            expect(err).not.toBeUndefined();
            expect(/Error: STG: reports: run is not a function/.test(err.payload[0].toString())).toBeTruthy();
            done();
        });
    });
    it('can do subclassing of Pipeline', function (done) {
        class newPipe extends pipeline_1.Pipeline {
            constructor() {
                super();
                this.addStage(new stage_1.Stage());
                this.addStage(new stage_1.Stage());
                this.addStage(new stage_1.Stage());
            }
        }
        var p1 = new newPipe();
        expect(p1.config.stages.length).toEqual(3);
        var p2 = new newPipe();
        p2.addStage(new stage_1.Stage());
        expect(p2.config.stages.length).toEqual(4);
        var p3 = new newPipe();
        expect(p3.config.stages.length).toEqual(3);
        done();
    });
    it('allow reenterability', function (done) {
        var pipe = new pipeline_1.Pipeline();
        pipe.addStage(function (context, done) {
            process.nextTick(function () {
                context.one++;
                done();
            });
        });
        pipe.addStage(function (context, done) {
            process.nextTick(function () {
                context.one += 1;
                done();
            });
        });
        pipe.addStage(function (context, done) {
            context.one += 5;
            done();
        });
        var l = 0;
        function gotit() {
            if (++l == 10)
                done();
        }
        for (var i = 0; i < 10; i++) {
            ;
            (function () {
                var ctx1 = {
                    one: 1,
                };
                pipe.execute(ctx1, function (err, data) {
                    expect(data === null || data === void 0 ? void 0 : data.one).toEqual(8);
                    gotit();
                });
            })();
        }
    });
});
//# sourceMappingURL=pipeline.test.js.map