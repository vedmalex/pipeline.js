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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiWaySwitch = void 0;
exports.isMultiWaySwitch = isMultiWaySwitch;
exports.getMultWaySwitchConfig = getMultWaySwitchConfig;
var stage_1 = require("./stage");
var ErrorList_1 = require("./utils/ErrorList");
var run_or_execute_1 = require("./utils/run_or_execute");
var types_1 = require("./utils/types");
var types_2 = require("./utils/types");
function isMultiWaySwitch(inp) {
    return (typeof inp == 'object' &&
        inp != null &&
        'stage' in inp &&
        (0, types_2.isRunPipelineFunction)(inp['stage']));
}
function getMultWaySwitchConfig(config) {
    if (Array.isArray(config)) {
        return {
            cases: config.map(function (item) {
                var res;
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
        var res = (0, types_2.getStageConfig)(config);
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
            return "Templ:".concat(this.config.name ? this.config.name : '');
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
                if (!(0, types_1.isAnyStage)(caseItem.stage) &&
                    typeof caseItem.stage == 'object') {
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
                else if (typeof caseItem.evaluate === 'boolean' &&
                    caseItem.evaluate) {
                    statics.push(caseItem);
                }
            }
        }
        var run = function (initialErr, initialCtx, done) { return __awaiter(_this, void 0, void 0, function () {
            var actuals, i_1, resultContext, promises, _loop_1, this_1, i_2, result, errors, err_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        actuals = [];
                        actuals.push.apply(actuals, statics);
                        for (i_1 = 0; i_1 < dynamics.length; i_1++) {
                            if (dynamics[i_1].evaluate(initialCtx)) {
                                actuals.push(dynamics[i_1]);
                            }
                        }
                        if (actuals.length === 0) {
                            return [2, done(initialErr, initialCtx)];
                        }
                        resultContext = null;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        promises = [];
                        _loop_1 = function (i_2) {
                            var stg = actuals[i_2];
                            var _b = Promise.withResolvers(), promise = _b.promise, resolve = _b.resolve, reject = _b.reject;
                            var lctx = this_1.splitCase(stg, initialCtx);
                            (0, run_or_execute_1.run_or_execute)(stg.stage, initialErr, lctx, function (err, retCtx) {
                                if (err) {
                                    reject(new Error('mws - error', {
                                        cause: {
                                            err: err,
                                            ctx: lctx,
                                            actuals: actuals,
                                            index: i_2,
                                        }
                                    }));
                                }
                                else {
                                    resultContext = _this.combineCase(stg, initialCtx, retCtx);
                                    resolve();
                                }
                            });
                            promises.push(promise);
                        };
                        this_1 = this;
                        for (i_2 = 0; i_2 < actuals.length; i_2++) {
                            _loop_1(i_2);
                        }
                        return [4, Promise.allSettled(promises)];
                    case 2:
                        result = _a.sent();
                        errors = result.filter(function (value) { return value.status === 'rejected'; })
                            .map(function (v) { return v.reason; });
                        if (errors.length > 0) {
                            done((0, ErrorList_1.createError)(errors), initialCtx);
                        }
                        else {
                            done(undefined, resultContext !== null && resultContext !== void 0 ? resultContext : initialCtx);
                        }
                        return [3, 4];
                    case 3:
                        err_1 = _a.sent();
                        done(err_1, initialCtx);
                        return [3, 4];
                    case 4: return [2];
                }
            });
        }); };
        this.run = run;
        return _super.prototype.compile.call(this, rebuild);
    };
    return MultiWaySwitch;
}(stage_1.Stage));
exports.MultiWaySwitch = MultiWaySwitch;
//# sourceMappingURL=multiwayswitch.js.map