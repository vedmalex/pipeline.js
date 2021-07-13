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
exports.Sequential = void 0;
var types_1 = require("./utils/types");
var stage_1 = require("./stage");
var run_or_execute_1 = require("./utils/run_or_execute");
var empty_run_1 = require("./utils/empty_run");
var ErrorList_1 = require("./utils/ErrorList");
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
            return "PLL:" + (this.config.name ? this.config.name : '');
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
            var run = function (err, ctx, done) {
                var iter = -1;
                var children = _this.split ? _this.split(ctx) : [ctx];
                var len = children ? children.length : 0;
                var next = function (err, retCtx) {
                    if (err) {
                        return done(new ErrorList_1.StageError({
                            name: 'Sequential stage Error',
                            stage: _this.name,
                            index: iter,
                            err: err,
                            ctx: children[iter],
                        }));
                    }
                    if (retCtx) {
                        children[iter] = retCtx;
                    }
                    iter += 1;
                    if (iter >= len) {
                        var result = _this.combine(ctx, children);
                        return done(undefined, result);
                    }
                    else {
                        (0, run_or_execute_1.run_or_execute)(_this.config.stage, err, children[iter], next);
                    }
                };
                if (len === 0) {
                    return done(err, ctx);
                }
                else {
                    next(err, ctx);
                }
            };
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