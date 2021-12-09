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
exports.Timeout = void 0;
var stage_1 = require("./stage");
var types_1 = require("./utils/types");
var run_or_execute_1 = require("./utils/run_or_execute");
var Timeout = (function (_super) {
    __extends(Timeout, _super);
    function Timeout(config) {
        var _this = _super.call(this) || this;
        if (config) {
            _this._config = (0, types_1.getTimeoutConfig)(config);
        }
        return _this;
    }
    Object.defineProperty(Timeout.prototype, "reportName", {
        get: function () {
            return "Templ:" + (this.config.name ? this.config.name : '');
        },
        enumerable: false,
        configurable: true
    });
    Timeout.prototype.toString = function () {
        return '[pipeline Timeout]';
    };
    Timeout.prototype.compile = function (rebuild) {
        var _this = this;
        if (rebuild === void 0) { rebuild = false; }
        var run = function (err, ctx, done) {
            var to;
            var localDone = function (err, retCtx) {
                if (to) {
                    clearTimeout(to);
                    to = null;
                    return done(err, retCtx);
                }
            };
            var waitFor;
            if (_this.config.timeout instanceof Function) {
                waitFor = _this.config.timeout(ctx);
            }
            else {
                waitFor = _this.config.timeout;
            }
            if (waitFor) {
                to = setTimeout(function () {
                    if (to) {
                        if (_this.config.overdue) {
                            (0, run_or_execute_1.run_or_execute)(_this.config.overdue, err, ctx, localDone);
                        }
                    }
                }, waitFor);
                if (_this.config.stage) {
                    (0, run_or_execute_1.run_or_execute)(_this.config.stage, err, ctx, localDone);
                }
            }
            else {
                if (_this.config.stage) {
                    (0, run_or_execute_1.run_or_execute)(_this.config.stage, err, ctx, done);
                }
            }
        };
        this.run = run;
        return _super.prototype.compile.call(this, rebuild);
    };
    return Timeout;
}(stage_1.Stage));
exports.Timeout = Timeout;
//# sourceMappingURL=timeout.js.map