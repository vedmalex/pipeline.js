"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultyWaySwitch = exports.getMultyWaySwitchConfig = exports.isMultyWaySwitchCase = void 0;
const stage_1 = require("./stage");
const types_1 = require("./utils/types");
const ErrorList_1 = require("./utils/ErrorList");
const run_or_execute_1 = require("./utils/run_or_execute");
function isMultyWaySwitchCase(inp) {
    return (typeof inp == 'object' &&
        inp != null &&
        inp.hasOwnProperty('stage') &&
        (0, types_1.isRunPipelineFunction)(inp['stage']));
}
exports.isMultyWaySwitchCase = isMultyWaySwitchCase;
function getMultyWaySwitchConfig(config) {
    if (Array.isArray(config)) {
        return {
            cases: config.map(item => {
                let res;
                if ((0, types_1.isRunPipelineFunction)(item)) {
                    res = { stage: item, evaluate: true };
                }
                else if (item instanceof stage_1.Stage) {
                    res = { stage: item, evaluate: true };
                }
                else if (isMultyWaySwitchCase(item)) {
                    res = item;
                }
                else {
                    throw (0, ErrorList_1.CreateError)('not suitable type for array in pipelin');
                }
                return res;
            }),
        };
    }
    else {
        const res = (0, types_1.getStageConfig)(config);
        if (res instanceof stage_1.Stage) {
            return { cases: [{ stage: res, evaluate: true }] };
        }
        else if (typeof config == 'object' && !(config instanceof stage_1.Stage)) {
            if ((config === null || config === void 0 ? void 0 : config.run) && config.cases && config.cases.length > 0) {
                throw (0, ErrorList_1.CreateError)(" don't use run and stage both ");
            }
            if (config.run) {
                res.cases = [{ stage: config.run, evaluate: true }];
            }
            if (config.cases) {
                res.cases = config.cases;
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
exports.getMultyWaySwitchConfig = getMultyWaySwitchConfig;
class MultyWaySwitch extends stage_1.Stage {
    constructor(config) {
        super();
        if (config) {
            this._config = getMultyWaySwitchConfig(config);
        }
    }
    get reportName() {
        return `Templ:${this.config.name ? this.config.name : ''}`;
    }
    toString() {
        return '[pipeline MultyWaySwitch]';
    }
    compile(rebuild = false) {
        let i;
        let statics = [];
        let dynamics = [];
        for (i = 0; i < this.config.cases.length; i++) {
            let caseItem;
            caseItem = this.config.cases[i];
            if (caseItem instanceof Function) {
                caseItem = {
                    stage: new stage_1.Stage(caseItem),
                    evaluate: true,
                };
            }
            if (caseItem instanceof stage_1.Stage) {
                caseItem = {
                    stage: caseItem,
                    evaluate: true,
                };
            }
            if (caseItem.stage) {
                if (caseItem.stage instanceof Function) {
                    caseItem.stage = caseItem.stage;
                }
                if (!(caseItem.stage instanceof stage_1.Stage) &&
                    typeof caseItem.stage == 'object') {
                    caseItem.stage = new stage_1.Stage(caseItem.stage);
                }
                if (!(caseItem.split instanceof Function)) {
                    caseItem.split = this.config.split;
                }
                if (!(caseItem.combine instanceof Function)) {
                    caseItem.combine = this.config.combine;
                }
                if (!caseItem.hasOwnProperty('evaluate')) {
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
                    if (err) {
                        if (!hasError)
                            hasError = true;
                        errors.push(new ErrorList_1.StageError({
                            name: 'MWS Error',
                            stage: this.name,
                            index: index,
                            err: err,
                            ctx: retCtx,
                        }));
                    }
                    else if (cur.combine)
                        cur.combine(ctx, retCtx);
                    if (iter >= actuals.length)
                        return done(hasError ? new ErrorList_1.ErrorList(errors) : undefined);
                };
            };
            let stg;
            let lctx;
            for (i = 0; i < actuals.length; i++) {
                stg = actuals[i];
                lctx = stg.split ? stg.split(ctx) : ctx;
                (0, run_or_execute_1.run_or_execute)(stg.stage, err, lctx, next(i));
            }
            if (actuals.length === 0) {
                return done(err);
            }
        };
        this.run = run;
        return super.compile(rebuild);
    }
}
exports.MultyWaySwitch = MultyWaySwitch;
//# sourceMappingURL=multywayswitch.js.map