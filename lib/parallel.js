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
exports.ParallelError = exports.Parallel = void 0;
var stage_1 = require("./stage");
var empty_run_1 = require("./utils/empty_run");
var ErrorList_1 = require("./utils/ErrorList");
var run_or_execute_1 = require("./utils/run_or_execute");
var types_1 = require("./utils/types");
var Parallel = (function (_super) {
    __extends(Parallel, _super);
    function Parallel(config) {
        var _this = _super.call(this) || this;
        if (config) {
            _this._config = (0, types_1.getParallelConfig)(config);
        }
        return _this;
    }
    Parallel.prototype.split = function (ctx) {
        return this._config.split ? this._config.split(ctx) : [ctx];
    };
    Parallel.prototype.combine = function (ctx, children) {
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
    Object.defineProperty(Parallel.prototype, "reportName", {
        get: function () {
            return "PLL:".concat(this.config.name ? this.config.name : '');
        },
        enumerable: false,
        configurable: true
    });
    Parallel.prototype.toString = function () {
        return '[pipeline Pipeline]';
    };
    Object.defineProperty(Parallel.prototype, "name", {
        get: function () {
            var _a, _b, _c;
            return (_c = (_a = this._config.name) !== null && _a !== void 0 ? _a : (_b = this._config.stage) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : '';
        },
        enumerable: false,
        configurable: true
    });
    Parallel.prototype.compile = function (rebuild) {
        var _this = this;
        if (rebuild === void 0) { rebuild = false; }
        if (this.config.stage) {
            var run = function (err, ctx, done) {
                var iter = 0;
                var children = _this.split(ctx);
                var len = children ? children.length : 0;
                var errors;
                var hasError = false;
                var next = function (index) {
                    return function (err, retCtx) {
                        if (!err) {
                            children[index] = retCtx !== null && retCtx !== void 0 ? retCtx : children[index];
                        }
                        else {
                            if (!hasError) {
                                hasError = true;
                                errors = [];
                            }
                            var error = new ParallelError({
                                stage: _this.name,
                                index: index,
                                err: err,
                                ctx: children[index],
                            });
                            if (error)
                                errors.push(error);
                        }
                        iter += 1;
                        if (iter >= len) {
                            if (!hasError) {
                                var result = _this.combine(ctx, children);
                                return done(undefined, result);
                            }
                            else {
                                return done((0, ErrorList_1.CreateError)(errors), ctx);
                            }
                        }
                    };
                };
                if (len === 0) {
                    return done(err, ctx);
                }
                else {
                    for (var i = 0; i < len; i++) {
                        (0, run_or_execute_1.run_or_execute)(_this.config.stage, err, children[i], next(i));
                    }
                }
            };
            this.run = run;
        }
        else {
            this.run = empty_run_1.empty_run;
        }
        return _super.prototype.compile.call(this);
    };
    return Parallel;
}(stage_1.Stage));
exports.Parallel = Parallel;
var ParallelError = (function (_super) {
    __extends(ParallelError, _super);
    function ParallelError(init) {
        var _this = _super.call(this, init.err.message) || this;
        _this.name = 'ParallerStageError';
        _this.stage = init.stage;
        _this.ctx = init.ctx;
        _this.err = init.err;
        _this.index = init.index;
        return _this;
    }
    ParallelError.prototype.toString = function () {
        return "".concat(this.name, ": at stage ").concat(this.stage, " error occured:\n    iteration ").concat(this.index, "\n    ").concat(this.err.message, "\n    stack is: ").concat(this.err.stack);
    };
    return ParallelError;
}(Error));
exports.ParallelError = ParallelError;
//# sourceMappingURL=parallel.js.map