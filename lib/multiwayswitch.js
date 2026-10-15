"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiWaySwitch = void 0;
exports.isMultiWaySwitch = isMultiWaySwitch;
exports.getMultWaySwitchConfig = getMultWaySwitchConfig;
const stage_1 = require("./stage");
const TypeDetectors_1 = require("./utils/TypeDetectors");
const ErrorList_1 = require("./utils/ErrorList");
const run_or_execute_1 = require("./utils/run_or_execute");
const warn_once_1 = require("./utils/warn_once");
const types_1 = require("./utils/types");
const types_2 = require("./utils/types");
function isMultiWaySwitch(inp) {
    return (typeof inp == 'object' &&
        inp != null &&
        'stage' in inp &&
        (0, types_2.isRunPipelineFunction)(inp['stage']));
}
function getMultWaySwitchConfig(config) {
    if (Array.isArray(config)) {
        return {
            cases: config.map(item => {
                let res;
                if ((0, types_2.isRunPipelineFunction)(item)) {
                    res = { stage: item, evaluate: true };
                }
                else if ((0, types_1.isAnyStage)(item)) {
                    res = {
                        stage: item,
                        evaluate: true,
                    };
                }
                else if (isMultiWaySwitch(item)) {
                    res = item;
                }
                else {
                    throw (0, ErrorList_1.createError)('not suitable type for array in pipelin');
                }
                return res;
            }),
        };
    }
    else {
        const res = (0, types_2.getStageConfig)(config);
        if ((0, types_1.isAnyStage)(res)) {
            return { cases: [{ stage: res, evaluate: true }] };
        }
        else if (typeof config == 'object' && !(0, types_1.isAnyStage)(config)) {
            if ((config === null || config === void 0 ? void 0 : config.run) && config.cases && config.cases.length > 0) {
                throw (0, ErrorList_1.createError)(" don't use run and stage both ");
            }
            if (config.run) {
                res.cases = [{ stage: config.run, evaluate: true }];
            }
            if (config.cases) {
                res.cases = config.cases;
            }
            if (config.split) {
                res.split = config.split;
            }
            if (config.combine) {
                res.combine = config.combine;
            }
        }
        else if (typeof config == 'function' && res.run) {
            res.cases = [{ stage: res.run, evaluate: true }];
            delete res.run;
        }
        if (typeof res.cases == 'undefined')
            res.cases = [];
        return res;
    }
}
class MultiWaySwitch extends stage_1.Stage {
    constructor(config) {
        super();
        if (config) {
            this._config = getMultWaySwitchConfig(config);
        }
    }
    get reportName() {
        return `Templ:${this.config.name ? this.config.name : ''}`;
    }
    toString() {
        return '[pipeline MultWaySwitch]';
    }
    combine(ctx, retCtx) {
        if (this.config.combine) {
            return this.config.combine(ctx, retCtx);
        }
        else {
            return ctx;
        }
    }
    combineCase(item, ctx, retCtx) {
        if (item.combine) {
            return item.combine(ctx, retCtx);
        }
        else {
            return this.combine(ctx, retCtx);
        }
    }
    split(ctx) {
        if (this.config.split) {
            return this.config.split(ctx);
        }
        else {
            return ctx;
        }
    }
    splitCase(item, ctx) {
        if (item.split) {
            return item.split(ctx);
        }
        else {
            return this.split(ctx);
        }
    }
    compile(rebuild = false) {
        var _a, _b;
        const _super = Object.create(null, {
            compile: { get: () => super.compile }
        });
        let i;
        let statics = [];
        let dynamics = [];
        for (i = 0; i < ((_b = (_a = this.config) === null || _a === void 0 ? void 0 : _a.cases) === null || _b === void 0 ? void 0 : _b.length); i++) {
            let caseItem;
            caseItem = this.config.cases[i];
            if ((0, TypeDetectors_1.isFunction)(caseItem)) {
                caseItem = {
                    stage: new stage_1.Stage(caseItem),
                    evaluate: true,
                };
            }
            if ((0, types_1.isAnyStage)(caseItem)) {
                caseItem = {
                    stage: caseItem,
                    evaluate: true,
                };
            }
            if (caseItem.stage) {
                if ((0, TypeDetectors_1.isFunction)(caseItem.stage)) {
                    caseItem.stage = caseItem.stage;
                }
                if (!(0, types_1.isAnyStage)(caseItem.stage) &&
                    typeof caseItem.stage == 'object') {
                    caseItem.stage = new stage_1.Stage(caseItem.stage);
                }
                if (!(0, TypeDetectors_1.isFunction)(caseItem.split)) {
                    caseItem.split = this.config.split;
                }
                if (!(0, TypeDetectors_1.isFunction)(caseItem.combine)) {
                    caseItem.combine = this.config.combine;
                }
                if (!('evaluate' in caseItem)) {
                    caseItem.evaluate = true;
                }
                if (typeof caseItem.evaluate === 'function') {
                    caseItem.evaluate;
                    dynamics.push(caseItem);
                }
                else if (typeof caseItem.evaluate === 'boolean' &&
                    caseItem.evaluate) {
                    statics.push(caseItem);
                }
            }
        }
        let run = (initialErr, initialCtx, done) => __awaiter(this, void 0, void 0, function* () {
            const actuals = [];
            actuals.push(...statics);
            for (let i = 0; i < dynamics.length; i++) {
                if (dynamics[i].evaluate(initialCtx)) {
                    actuals.push(dynamics[i]);
                }
            }
            if (actuals.length === 0) {
                return done(initialErr, initialCtx);
            }
            if (actuals.length > 1 &&
                actuals.some((item) => typeof item.combine === 'function')) {
                (0, warn_once_1.warnOnce)('mws-multi-combine-order', '[pipeline.js] MultiWaySwitch: multiple matching cases with combine functions are folded in async completion order. Make combine commutative or use Sequential if order matters.');
            }
            let resultContext = null;
            try {
                const promises = [];
                for (let i = 0; i < actuals.length; i++) {
                    const stg = actuals[i];
                    const { promise, resolve, reject } = Promise.withResolvers();
                    const lctx = this.splitCase(stg, initialCtx);
                    (0, run_or_execute_1.run_or_execute)(stg.stage, initialErr, lctx, (err, retCtx) => {
                        if (err) {
                            reject(new Error('mws - error', {
                                cause: {
                                    err,
                                    ctx: lctx,
                                    actuals,
                                    index: i,
                                }
                            }));
                        }
                        else {
                            resultContext = this.combineCase(stg, resultContext !== null && resultContext !== void 0 ? resultContext : initialCtx, retCtx);
                            resolve();
                        }
                    });
                    promises.push(promise);
                }
                const result = yield Promise.allSettled(promises);
                let errors = result.filter((value) => value.status === 'rejected')
                    .map(v => v.reason);
                if (errors.length > 0) {
                    done((0, ErrorList_1.createError)(errors), initialCtx);
                }
                else {
                    done(undefined, resultContext !== null && resultContext !== void 0 ? resultContext : initialCtx);
                }
            }
            catch (err) {
                done(err, initialCtx);
            }
        });
        this.run = run;
        return super.compile(rebuild);
    }
}
exports.MultiWaySwitch = MultiWaySwitch;
//# sourceMappingURL=multiwayswitch.js.map