"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiWaySwitch = void 0;
const stage_1 = require("../../stage");
const getMultWaySwitchConfig_1 = require("./getMultWaySwitchConfig");
class MultiWaySwitch extends stage_1.Stage {
    constructor(config) {
        super();
        if (config) {
            this._config = (0, getMultWaySwitchConfig_1.getMultWaySwitchConfig)(config);
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
            if ((0, stage_1.isAnyStage)(caseItem)) {
                caseItem = {
                    stage: caseItem,
                    evaluate: true,
                };
            }
            if (caseItem.stage) {
                if (caseItem.stage instanceof Function) {
                    caseItem.stage = caseItem.stage;
                }
                if (!(0, stage_1.isAnyStage)(caseItem.stage) && typeof caseItem.stage == 'object') {
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
                        return done(hasError ? (0, stage_1.CreateError)(errors) : undefined, res !== null && res !== void 0 ? res : ctx);
                    }
                };
            };
            let stg;
            let lctx;
            for (i = 0; i < actuals.length; i++) {
                stg = actuals[i];
                lctx = this.splitCase(stg, ctx);
                (0, stage_1.run_or_execute)(stg.stage, err, lctx, next(i));
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
//# sourceMappingURL=MultiWaySwitch.js.map