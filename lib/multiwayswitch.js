"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiWaySwitch = exports.getMultWaySwitchConfig = exports.isMultiWaySwitch = void 0;
var stage_1 = require("./stage");
var types_1 = require("./utils/types");
var ErrorList_1 = require("./utils/ErrorList");
var run_or_execute_1 = require("./utils/run_or_execute");
function isMultiWaySwitch(inp) {
    return (typeof inp == 'object' &&
        inp != null &&
        inp.hasOwnProperty('stage') &&
        (0, types_1.isRunPipelineFunction)(inp['stage']));
}
exports.isMultiWaySwitch = isMultiWaySwitch;
function getMultWaySwitchConfig(config) {
    if (Array.isArray(config)) {
        return {
            cases: config.map(function (item) {
                var res;
                if ((0, types_1.isRunPipelineFunction)(item)) {
                    res = { stage: item, evaluate: true };
                }
                else if (item instanceof stage_1.Stage) {
                    res = { stage: item, evaluate: true };
                }
                else if (isMultiWaySwitch(item)) {
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
        var res = (0, types_1.getStageConfig)(config);
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
var MultiWaySwitch = (function (_super) {
    __extends(MultiWaySwitch, _super);
    function MultiWaySwitch(config) {
        var _this = _super.call(this) || this;
        if (config) {
            _this._config = getMultWaySwitchConfig(config);
        }
        return _this;
    }
    Object.defineProperty(MultiWaySwitch.prototype, "reportName", {
        get: function () {
            return "Templ:" + (this.config.name ? this.config.name : '');
        },
        enumerable: false,
        configurable: true
    });
    MultiWaySwitch.prototype.toString = function () {
        return '[pipeline MultWaySwitch]';
    };
    MultiWaySwitch.prototype.combine = function (ctx, retCtx) {
        if (this.config.combine) {
            return this.config.combine(ctx, retCtx);
        }
        else {
            return ctx;
        }
    };
    MultiWaySwitch.prototype.combineCase = function (item, ctx, retCtx) {
        if (item.combine) {
            return item.combine(ctx, retCtx);
        }
        else {
            return this.combine(ctx, retCtx);
        }
    };
    MultiWaySwitch.prototype.split = function (ctx) {
        if (this.config.split) {
            return this.config.split(ctx);
        }
        else {
            return ctx;
        }
    };
    MultiWaySwitch.prototype.splitCase = function (item, ctx) {
        if (item.split) {
            return item.split(ctx);
        }
        else {
            return this.split(ctx);
        }
    };
    MultiWaySwitch.prototype.compile = function (rebuild) {
        var _this = this;
        var _a, _b;
        if (rebuild === void 0) { rebuild = false; }
        var i;
        var statics = [];
        var dynamics = [];
        for (i = 0; i < ((_b = (_a = this.config) === null || _a === void 0 ? void 0 : _a.cases) === null || _b === void 0 ? void 0 : _b.length); i++) {
            var caseItem = void 0;
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
        var run = function (err, ctx, done) {
            var actuals = [];
            actuals.push.apply(actuals, statics);
            for (var i_1 = 0; i_1 < dynamics.length; i_1++) {
                if (dynamics[i_1].evaluate(ctx)) {
                    actuals.push(dynamics[i_1]);
                }
            }
            var iter = 0;
            var errors = [];
            var hasError = false;
            var next = function (index) {
                return function (err, retCtx) {
                    iter++;
                    var cur = actuals[index];
                    var res = undefined;
                    if (err) {
                        if (!hasError)
                            hasError = true;
                        errors.push(new ErrorList_1.StageError({
                            name: 'MWS Error',
                            stage: _this.name,
                            index: index,
                            err: err,
                            ctx: retCtx,
                        }));
                    }
                    else {
                        res = _this.combineCase(cur, ctx, retCtx);
                    }
                    if (iter >= actuals.length)
                        return done(hasError ? new ErrorList_1.ErrorList(errors) : undefined, res !== null && res !== void 0 ? res : ctx);
                };
            };
            var stg;
            var lctx;
            for (i = 0; i < actuals.length; i++) {
                stg = actuals[i];
                lctx = _this.splitCase(stg, ctx);
                (0, run_or_execute_1.run_or_execute)(stg.stage, err, lctx, next(i));
            }
            if (actuals.length === 0) {
                return done(err);
            }
        };
        this.run = run;
        return _super.prototype.compile.call(this, rebuild);
    };
    return MultiWaySwitch;
}(stage_1.Stage));
exports.MultiWaySwitch = MultiWaySwitch;
//# sourceMappingURL=multiwayswitch.js.map