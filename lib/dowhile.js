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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoWhile = void 0;
var stage_1 = require("./stage");
var ErrorList_1 = require("./utils/ErrorList");
var run_or_execute_1 = require("./utils/run_or_execute");
var DoWhile = (function (_super) {
    __extends(DoWhile, _super);
    function DoWhile(_config) {
        var _this = this;
        var config = {};
        if (_config instanceof stage_1.Stage) {
            config.stage = _config;
        }
        else {
            if (typeof _config == 'function') {
                config.stage = _config;
            }
            else {
                if ((_config === null || _config === void 0 ? void 0 : _config.run) && (_config === null || _config === void 0 ? void 0 : _config.stage)) {
                    throw (0, ErrorList_1.CreateError)('use or run or stage, not both');
                }
                if (_config === null || _config === void 0 ? void 0 : _config.stage) {
                    config.stage = _config.stage;
                }
                if ((_config === null || _config === void 0 ? void 0 : _config.split) instanceof Function) {
                    config.split = _config.split;
                }
                if ((_config === null || _config === void 0 ? void 0 : _config.reachEnd) instanceof Function) {
                    config.reachEnd = _config.reachEnd;
                }
            }
        }
        _this = _super.call(this, config) || this;
        _this._config = __assign(__assign({}, _this._config), config);
        return _this;
    }
    Object.defineProperty(DoWhile.prototype, "reportName", {
        get: function () {
            return "WHI:" + (this.config.name ? this.config.name : '');
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
        var run = function (err, context, done) {
            var iter = -1;
            var next = function (err) {
                iter++;
                if (_this.reachEnd(err, context, iter)) {
                    return done(err, context);
                }
                else {
                    (0, run_or_execute_1.run_or_execute)(_this.config.stage, err, _this.split(context, iter), next);
                }
            };
            next(err);
        };
        this.run = run;
        return _super.prototype.compile.call(this, rebuild);
    };
    return DoWhile;
}(stage_1.Stage));
exports.DoWhile = DoWhile;
//# sourceMappingURL=dowhile.js.map