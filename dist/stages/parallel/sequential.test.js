"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("jest");
const Sequential_1 = require("./Sequential");
const stage_1 = require("../../stage");
const wrap_1 = require("../wrap/wrap");
describe('Sequential', function () {
    it('works with default', function (done) {
        var stage = new Sequential_1.Sequential();
        expect(stage).toBeInstanceOf(Sequential_1.Sequential);
        stage.execute({}, function (err, context) {
            expect(err).toBeUndefined();
            done();
        });
    });
    it('rescue', function (done) {
        var st = new stage_1.Stage({
            run: function (err, ctx, done) {
                throw new Error('error');
            },
            rescue: function (err, conext) {
                if (err.payload[0].message !== 'some') {
                    throw err;
                }
            },
        });
        var stage = new Sequential_1.Sequential({
            stage: st,
            rescue: function (err, conext) {
                if (err.payload[0].message !== 'error') {
                    throw err;
                }
            },
        });
        stage.execute({}, function (err, ctx) {
            expect(err).toBeUndefined();
            done();
        });
    });
    it('works with config as Stage', function (done) {
        var stage = new Sequential_1.Sequential(new stage_1.Stage(function (err, ctx, done) {
            done();
        }));
        stage.execute({}, function (err, context) {
            done();
        });
    });
    it('not allows to use constructor as a function', function (done) {
        try {
            var s = (0, Sequential_1.Sequential)();
        }
        catch (err) {
            done();
        }
    });
    it('run stage', function (done) {
        var stage0 = new stage_1.Stage(function (ctx) {
            ctx.iter++;
        });
        var stage = new Sequential_1.Sequential({
            stage: stage0,
            split: function (ctx) {
                ctx.split = [0, 0, 0, 0, 0].map(function (i) {
                    return {
                        iter: 0,
                    };
                });
                return ctx.split;
            },
            combine: function (ctx, children) {
                ctx.iter = children.reduce(function (p, c, i, a) {
                    return p + c.iter;
                }, 0);
                delete ctx.split;
                return ctx;
            },
        });
        stage.execute({}, function (err, context) {
            expect(context === null || context === void 0 ? void 0 : context.iter).toBe(5);
            done();
        });
    });
    it('empty split not run combine', function (done) {
        var stage0 = new stage_1.Stage(function (ctx) { });
        var stage = new Sequential_1.Sequential({
            stage: stage0,
            split: function (ctx) {
                return [];
            },
            combine: function (ctx, children) {
                ctx.combine = true;
                return ctx;
            },
        });
        stage.execute({}, function (err, context) {
            expect(context === null || context === void 0 ? void 0 : context.combine).toBeUndefined();
            done();
        });
    });
    it('prepare context -> moved to Wrap', function (done) {
        var stage0 = new stage_1.Stage(function (ctx) {
            ctx.iteration++;
        });
        var stage = new wrap_1.Wrap({
            prepare: function (ctx) {
                return {
                    iteration: ctx.iter,
                };
            },
            finalize: function (ctx, retCtx) {
                ctx.iter = retCtx.iteration;
            },
            stage: new Sequential_1.Sequential({
                stage: stage0,
                split: function (ctx) {
                    ctx.split = [0, 0, 0, 0, 0].map(function (i) {
                        return {
                            iteration: 0,
                        };
                    });
                    return ctx.split;
                },
                combine: function (ctx, children) {
                    ctx.iteration = children.reduce(function (p, c) {
                        return p + c.iteration;
                    }, 0);
                    delete ctx.split;
                    return ctx;
                },
            }),
        });
        stage.execute({
            iter: 0,
        }, function (err, context) {
            expect(err).toBeUndefined();
            expect(context).not.toBeUndefined();
            expect(context === null || context === void 0 ? void 0 : context.iter).toEqual(5);
            expect(context === null || context === void 0 ? void 0 : context.iteration).toBeUndefined();
            done();
        });
    });
});
//# sourceMappingURL=sequential.test.js.map