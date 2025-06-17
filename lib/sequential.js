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
exports.Sequential = void 0;
var stage_1 = require("./stage");
var empty_run_1 = require("./utils/empty_run");
var run_or_execute_1 = require("./utils/run_or_execute");
var types_1 = require("./utils/types");
var Sequential = (function (_super) {
    __extends(Sequential, _super);
    function Sequential(config) {
        var _this = _super.call(this) || this;
        if (config) {
            _this._config = (0, types_1.getParallelConfig)(config);
        }
        return _this;
    }
    Sequential.prototype.split = function (ctx) {
        return this._config.split ? this._config.split(ctx) : [ctx];
    };
    Sequential.prototype.combine = function (ctx, children) {
        var res;
        if (this.config.combine) {
            var c = this.config.combine(ctx, children);
            res = c !== null && c !== void 0 ? c : ctx;
        }
        else {
            res = ctx;
        }
        return res;
    };
    Object.defineProperty(Sequential.prototype, "reportName", {
        get: function () {
            return "PLL:".concat(this.config.name ? this.config.name : '');
        },
        enumerable: false,
        configurable: true
    });
    Sequential.prototype.toString = function () {
        return '[pipeline Pipeline]';
    };
    Object.defineProperty(Sequential.prototype, "name", {
        get: function () {
            var _a, _b, _c;
            return (_c = (_a = this._config.name) !== null && _a !== void 0 ? _a : (_b = this._config.stage) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : '';
        },
        enumerable: false,
        configurable: true
    });
    Sequential.prototype.compile = function (rebuild) {
        var _this = this;
        if (rebuild === void 0) { rebuild = false; }
        if (this.config.stage) {
            var run = function (initialErr, initialCtx, done) { return __awaiter(_this, void 0, void 0, function () {
                var iter_1, children_1, len, currentError, currentChildren, _loop_1, this_1, state_1, result, err_1;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 4, , 5]);
                            iter_1 = -1;
                            children_1 = this.split
                                ? this.split(initialCtx)
                                : [initialCtx];
                            len = children_1.length;
                            if (len === 0) {
                                return [2, done(initialErr, initialCtx)];
                            }
                            currentError = initialErr;
                            currentChildren = [];
                            currentChildren.length = len;
                            currentChildren.fill(undefined);
                            _loop_1 = function () {
                                var _b, resolve, reject, promise, _c, _d;
                                return __generator(this, function (_e) {
                                    switch (_e.label) {
                                        case 0:
                                            if (currentError)
                                                return [2, "break"];
                                            _b = Promise.withResolvers(), resolve = _b.resolve, reject = _b.reject, promise = _b.promise;
                                            (0, run_or_execute_1.run_or_execute)(this_1.config.stage, currentError, children_1[iter_1], function (err, ctx) {
                                                if (err) {
                                                    reject(err);
                                                }
                                                else if (ctx) {
                                                    resolve(ctx);
                                                }
                                            });
                                            _c = currentChildren;
                                            _d = iter_1;
                                            return [4, promise.catch(function (err) {
                                                    throw new Error('sequential - error', {
                                                        cause: {
                                                            err: err,
                                                            iteration: iter_1,
                                                            stage: _this.config.stage,
                                                            ctx: children_1[iter_1]
                                                        },
                                                    });
                                                })];
                                        case 1:
                                            _c[_d] = _e.sent();
                                            return [2];
                                    }
                                });
                            };
                            this_1 = this;
                            _a.label = 1;
                        case 1:
                            if (!(++iter_1 < len)) return [3, 3];
                            return [5, _loop_1()];
                        case 2:
                            state_1 = _a.sent();
                            if (state_1 === "break")
                                return [3, 3];
                            return [3, 1];
                        case 3:
                            if (currentError) {
                                done(currentError);
                            }
                            else {
                                result = this.combine(initialCtx, currentChildren);
                                done(undefined, result);
                            }
                            return [3, 5];
                        case 4:
                            err_1 = _a.sent();
                            done(err_1);
                            return [3, 5];
                        case 5: return [2];
                    }
                });
            }); };
            this.run = run;
        }
        else {
            this.run = empty_run_1.empty_run;
        }
        return _super.prototype.compile.call(this);
    };
    return Sequential;
}(stage_1.Stage));
exports.Sequential = Sequential;
//# sourceMappingURL=sequential.js.map