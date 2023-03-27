"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiWaySwitch = exports.getMultWaySwitchConfig = exports.isMultiWaySwitch = void 0;
const stage_1 = require("./stage");
const ErrorList_1 = require("./utils/ErrorList");
const run_or_execute_1 = require("./utils/run_or_execute");
const types_1 = require("./utils/types/types");
const types_2 = require("./utils/types/types");
function isMultiWaySwitch(inp) {
    return (typeof inp == 'object' && inp != null && 'stage' in inp && (0, types_2.isRunPipelineFunction)(inp['stage']));
}
exports.isMultiWaySwitch = isMultiWaySwitch;
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
                    throw (0, ErrorList_1.CreateError)(new Error('not suitable type for array in pipelin'));
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
                throw (0, ErrorList_1.CreateError)(new Error(" don't use run and stage both "));
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
exports.getMultWaySwitchConfig = getMultWaySwitchConfig;
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
        var _a;
        if (this.config.split) {
            return (_a = this.config.split(ctx)) !== null && _a !== void 0 ? _a : ctx;
        }
        else {
            return ctx;
        }
    }
    splitCase(item, ctx) {
        if (typeof item === 'object' && item !== null && 'split' in item && typeof item.split === 'function') {
            return item.split(ctx);
        }
        else {
            return this.split(ctx);
        }
    }
    compile(rebuild = false) {
        var _a, _b;
        let i;
        let statics = [];
        let dynamics = [];
        for (i = 0; i < ((_b = (_a = this.config) === null || _a === void 0 ? void 0 : _a.cases) === null || _b === void 0 ? void 0 : _b.length); i++) {
            let caseItem;
            caseItem = this.config.cases[i];
            if (caseItem instanceof Function) {
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
                if (caseItem.stage instanceof Function) {
                    caseItem.stage = caseItem.stage;
                }
                if (!(0, types_1.isAnyStage)(caseItem.stage) && typeof caseItem.stage == 'object') {
                    caseItem.stage = new stage_1.Stage(caseItem.stage);
                }
                if (!(caseItem.split instanceof Function)) {
                    caseItem.split = this.config.split;
                }
                if (!(caseItem.combine instanceof Function)) {
                    caseItem.combine = this.config.combine;
                }
                if (!('evaluate' in caseItem)) {
                    caseItem.evaluate = true;
                }
                if (typeof caseItem.evaluate === 'function') {
                    caseItem.evaluate;
                    dynamics.push(caseItem);
                }
                else if (typeof caseItem.evaluate === 'boolean' && caseItem.evaluate) {
                    statics.push(caseItem);
                }
            }
        }
        let run = (err, ctx, done) => {
            let actuals = [];
            actuals.push.apply(actuals, statics);
            for (let i = 0; i < dynamics.length; i++) {
                if (dynamics[i].evaluate(ctx)) {
                    actuals.push(dynamics[i]);
                }
            }
            let iter = 0;
            let errors = [];
            let hasError = false;
            let next = (index) => {
                return (err, retCtx) => {
                    iter++;
                    let cur = actuals[index];
                    let res = null;
                    if (err) {
                        if (!hasError)
                            hasError = true;
                        errors.push(err);
                    }
                    else {
                        res = this.combineCase(cur, ctx, retCtx);
                    }
                    if (iter >= actuals.length) {
                        return done(hasError ? (0, ErrorList_1.CreateError)(errors) : undefined, (res !== null && res !== void 0 ? res : ctx));
                    }
                };
            };
            let stg;
            let lctx;
            for (i = 0; i < actuals.length; i++) {
                stg = actuals[i];
                lctx = this.splitCase(stg, ctx);
                (0, run_or_execute_1.run_or_execute)(stg.stage, err, lctx, next(i));
            }
            if (actuals.length === 0) {
                return done(err, ctx);
            }
        };
        this.run = run;
        return super.compile(rebuild);
    }
}
exports.MultiWaySwitch = MultiWaySwitch;
//# sourceMappingURL=multiwayswitch.js.map