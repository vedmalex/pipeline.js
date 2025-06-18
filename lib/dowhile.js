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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.DoWhile = void 0;
var stage_1 = require("./stage");
var TypeDetectors_1 = require("./utils/TypeDetectors");
var ErrorList_1 = require("./utils/ErrorList");
var run_or_execute_1 = require("./utils/run_or_execute");
var types_1 = require("./utils/types");
var DoWhile = (function (_super) {
    __extends(DoWhile, _super);
    function DoWhile(_config) {
        var _this = this;
        var config = {};
        if ((0, types_1.isAnyStage)(_config)) {
            config.stage = _config;
        }
        else if (typeof _config == 'function') {
            config.stage = _config;
        }
        else {
            if ((_config === null || _config === void 0 ? void 0 : _config.run) && (_config === null || _config === void 0 ? void 0 : _config.stage)) {
                throw (0, ErrorList_1.createError)('use or run or stage, not both');
            }
            if (_config === null || _config === void 0 ? void 0 : _config.stage) {
                config.stage = _config.stage;
            }
            if ((0, TypeDetectors_1.isFunction)(_config === null || _config === void 0 ? void 0 : _config.split)) {
                config.split = _config.split;
            }
            if ((0, TypeDetectors_1.isFunction)(_config === null || _config === void 0 ? void 0 : _config.reachEnd)) {
                config.reachEnd = _config.reachEnd;
            }
        }
        _this = _super.call(this, config) || this;
        _this._config = __assign(__assign({}, _this._config), config);
        return _this;
    }
    Object.defineProperty(DoWhile.prototype, "reportName", {
        get: function () {
            return "WHI:".concat(this.config.name ? this.config.name : '');
        },
        enumerable: false,
        configurable: true
    });
    DoWhile.prototype.toString = function () {
        return '[pipeline DoWhile]';
    };
    DoWhile.prototype.reachEnd = function (err, ctx, iter) {
        if (this.config.reachEnd) {
            return this.config.reachEnd(err, ctx, iter);
        }
        else
            return true;
    };
    DoWhile.prototype.split = function (ctx, iter) {
        if (this.config.split) {
            return this.config.split(ctx, iter);
        }
        else
            return ctx;
    };
    DoWhile.prototype.compile = function (rebuild) {
        var _this = this;
        if (rebuild === void 0) { rebuild = false; }
        var run = function (initialErr, initialContext, done) { return __awaiter(_this, void 0, void 0, function () {
            var iter, currentError, currentContext, _loop_1, this_1, state_1, err_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        iter = -1;
                        currentError = initialErr;
                        currentContext = initialContext;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, 6, 7]);
                        _loop_1 = function () {
                            var _b, resolve, promise;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        iter++;
                                        if (this_1.reachEnd(currentError, currentContext, iter)) {
                                            return [2, "break"];
                                        }
                                        _b = Promise.withResolvers(), resolve = _b.resolve, promise = _b.promise;
                                        (0, run_or_execute_1.run_or_execute)(this_1.config.stage, currentError, this_1.split(currentContext, iter), function (err, ctx) {
                                            if (err) {
                                                currentError = err;
                                            }
                                            else {
                                                currentContext = ctx !== null && ctx !== void 0 ? ctx : currentContext;
                                            }
                                            resolve();
                                        });
                                        return [4, promise];
                                    case 1:
                                        _c.sent();
                                        return [2];
                                }
                            });
                        };
                        this_1 = this;
                        _a.label = 2;
                    case 2:
                        if (!true) return [3, 4];
                        return [5, _loop_1()];
                    case 3:
                        state_1 = _a.sent();
                        if (state_1 === "break")
                            return [3, 4];
                        return [3, 2];
                    case 4: return [3, 7];
                    case 5:
                        err_1 = _a.sent();
                        currentError = err_1;
                        return [3, 7];
                    case 6:
                        done(currentError, currentContext);
                        return [7];
                    case 7: return [2];
                }
            });
        }); };
        this.run = run;
        return _super.prototype.compile.call(this, rebuild);
    };
    return DoWhile;
}(stage_1.Stage));
exports.DoWhile = DoWhile;
//# sourceMappingURL=dowhile.js.map