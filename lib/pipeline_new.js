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
exports.Pipeline = void 0;
var stage_1 = require("./stage");
var empty_run_1 = require("./utils/empty_run");
var run_or_execute_1 = require("./utils/run_or_execute");
var types_1 = require("./utils/types");
var types_2 = require("./utils/types");
var Pipeline = (function (_super) {
    __extends(Pipeline, _super);
    function Pipeline(config) {
        var _this = _super.call(this) || this;
        if (config) {
            _this._config = (0, types_2.getPipelinConfig)(config);
        }
        else {
            _this._config.stages = [];
        }
        return _this;
    }
    Object.defineProperty(Pipeline.prototype, "reportName", {
        get: function () {
            return "PIPE:".concat(this.config.name ? this.config.name : '');
        },
        enumerable: false,
        configurable: true
    });
    Pipeline.prototype.addStage = function (_stage) {
        var stage;
        if (typeof _stage === 'function') {
            stage = _stage;
        }
        else {
            if (typeof _stage === 'object') {
                if ((0, types_1.isAnyStage)(_stage)) {
                    stage = _stage;
                }
                else {
                    stage = new stage_1.Stage(_stage);
                }
            }
        }
        if (stage) {
            this.config.stages.push(stage);
            this.run = undefined;
        }
    };
    Pipeline.prototype.toString = function () {
        return '[pipeline Pipeline]';
    };
    Pipeline.prototype.compile = function (rebuild) {
        var _this = this;
        if (rebuild === void 0) { rebuild = false; }
        var runAsync = function (initialErr, context) { return __awaiter(_this, void 0, void 0, function () {
            var currentContext, _loop_1, this_1, i;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        currentContext = context;
                        _loop_1 = function (i) {
                            var stage, _b, promise, resolve, reject;
                            return __generator(this, function (_c) {
                                switch (_c.label) {
                                    case 0:
                                        stage = this_1.config.stages[i];
                                        _b = Promise.withResolvers(), promise = _b.promise, resolve = _b.resolve, reject = _b.reject;
                                        (0, run_or_execute_1.run_or_execute)(stage, initialErr, currentContext, function (err, ctx) {
                                            if (err) {
                                                reject(err);
                                            }
                                            else {
                                                resolve(ctx !== null && ctx !== void 0 ? ctx : currentContext);
                                            }
                                        });
                                        return [4, promise.catch(function (err) {
                                                throw new Error('pipeline.js', {
                                                    cause: {
                                                        err: err,
                                                        i: i,
                                                        stages: _this.config.stages,
                                                        ctx: currentContext
                                                    },
                                                });
                                            })];
                                    case 1:
                                        _c.sent();
                                        return [2];
                                }
                            });
                        };
                        this_1 = this;
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < this.config.stages.length)) return [3, 4];
                        return [5, _loop_1(i)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        i++;
                        return [3, 1];
                    case 4: return [2, currentContext];
                }
            });
        }); };
        if (this.config.stages.length > 0) {
            this.run = function (err, context, done) {
                var error = err;
                var ctx = context;
                runAsync(err, context)
                    .then(function (retCtx) { if (retCtx) {
                    ctx = retCtx;
                } })
                    .catch(function (err) { if (err)
                    error = err; })
                    .finally(function () {
                    done(error, ctx);
                });
            };
        }
        else {
            this.run = empty_run_1.empty_run;
        }
        return _super.prototype.compile.call(this, rebuild);
    };
    return Pipeline;
}(stage_1.Stage));
exports.Pipeline = Pipeline;
//# sourceMappingURL=pipeline_new.js.map