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
exports.RetryOnError = void 0;
exports.getRetryOnErrorConfig = getRetryOnErrorConfig;
var context_1 = require("./context");
var stage_1 = require("./stage");
var TypeDetectors_1 = require("./utils/TypeDetectors");
var ErrorList_1 = require("./utils/ErrorList");
var run_or_execute_1 = require("./utils/run_or_execute");
var types_1 = require("./utils/types");
var types_2 = require("./utils/types");
function getRetryOnErrorConfig(config) {
    var res = (0, types_1.getStageConfig)(config);
    if ((0, types_2.isAnyStage)(res)) {
        return { stage: res };
    }
    else if (typeof config == 'object' && !(0, types_2.isAnyStage)(config)) {
        if (config.run && config.stage) {
            throw (0, ErrorList_1.createError)("don't use run and stage both");
        }
        if (config.run) {
            res.stage = config.run;
        }
        if (config.stage) {
            res.stage = config.stage;
        }
        if (config.backup) {
            res.backup = config.backup;
        }
        if (config.restore) {
            res.restore = config.restore;
        }
        if (config.retry) {
            if (typeof config.retry !== 'function') {
                config.retry *= 1;
            }
            res.retry = config.retry;
        }
        if (!res.retry)
            res.retry = 1;
    }
    else if (typeof config == 'function' && res.run) {
        res.stage = res.run;
        delete res.run;
    }
    return res;
}
var RetryOnError = (function (_super) {
    __extends(RetryOnError, _super);
    function RetryOnError(config) {
        var _this = _super.call(this) || this;
        if (config) {
            _this._config = getRetryOnErrorConfig(config);
        }
        return _this;
    }
    Object.defineProperty(RetryOnError.prototype, "reportName", {
        get: function () {
            return "Templ:".concat(this.config.name ? this.config.name : '');
        },
        enumerable: false,
        configurable: true
    });
    RetryOnError.prototype.toString = function () {
        return '[pipeline RetryOnError]';
    };
    RetryOnError.prototype.backupContext = function (ctx) {
        if (this.config.backup) {
            return this.config.backup(ctx);
        }
        else {
            if (context_1.Context.isContext(ctx)) {
                return ctx.fork({});
            }
            else {
                return ctx;
            }
        }
    };
    RetryOnError.prototype.restoreContext = function (ctx, backup) {
        if (this.config.restore) {
            var res = this.config.restore(ctx, backup);
            return res !== null && res !== void 0 ? res : ctx;
        }
        else {
            if (context_1.Context.isContext(ctx)) {
                for (var key in backup) {
                    ;
                    ctx[key] = backup[key];
                }
                return ctx;
            }
            else {
                return backup;
            }
        }
    };
    RetryOnError.prototype.compile = function (rebuild) {
        var _this = this;
        if (rebuild === void 0) { rebuild = false; }
        var run = function (initialErr, initialCtx, done) { return __awaiter(_this, void 0, void 0, function () {
            var currentError, currentCtx, iter, backup, reachEnd, _loop_1, this_1, err_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        currentError = initialErr;
                        currentCtx = initialCtx;
                        iter = -1;
                        backup = this.backupContext(initialCtx);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 6, , 7]);
                        reachEnd = function (err, iteration) {
                            if (err) {
                                if ((0, TypeDetectors_1.isFunction)(_this.config.retry)) {
                                    return !_this.config.retry(err, currentCtx, iteration);
                                }
                                else {
                                    return iteration > _this.config.retry;
                                }
                            }
                            return true;
                        };
                        _loop_1 = function () {
                            var _b, resolve, reject, promise;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        iter++;
                                        if (iter > 0)
                                            currentCtx = this_1.restoreContext(currentCtx, backup);
                                        _b = Promise.withResolvers(), resolve = _b.resolve, reject = _b.reject, promise = _b.promise;
                                        (0, run_or_execute_1.run_or_execute)(this_1.config.stage, currentError, currentCtx, function (err, ctx) {
                                            if (err) {
                                                reject(err);
                                            }
                                            else {
                                                resolve(ctx !== null && ctx !== void 0 ? ctx : currentCtx);
                                            }
                                        });
                                        return [4, promise
                                                .then(function (ret) {
                                                currentCtx = ret;
                                                currentError = undefined;
                                            }).catch(function (err) {
                                                currentError = err;
                                            })];
                                    case 1:
                                        _c.sent();
                                        return [2];
                                }
                            });
                        };
                        this_1 = this;
                        _a.label = 2;
                    case 2: return [5, _loop_1()];
                    case 3:
                        _a.sent();
                        _a.label = 4;
                    case 4:
                        if (!reachEnd(currentError, iter)) return [3, 2];
                        _a.label = 5;
                    case 5:
                        done(currentError, currentCtx);
                        return [3, 7];
                    case 6:
                        err_1 = _a.sent();
                        currentCtx = this.restoreContext(currentCtx, backup);
                        done(err_1, initialCtx);
                        return [3, 7];
                    case 7: return [2];
                }
            });
        }); };
        this.run = run;
        return _super.prototype.compile.call(this, rebuild);
    };
    return RetryOnError;
}(stage_1.Stage));
exports.RetryOnError = RetryOnError;
//# sourceMappingURL=retryonerror.js.map