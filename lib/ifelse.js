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
exports.IfElse = void 0;
var stage_1 = require("./stage");
var execute_validate_1 = require("./utils/execute_validate");
var run_or_execute_1 = require("./utils/run_or_execute");
var types_1 = require("./utils/types");
var IfElse = (function (_super) {
    __extends(IfElse, _super);
    function IfElse(config) {
        var _this = _super.call(this) || this;
        if (config) {
            _this._config = (0, types_1.getIfElseConfig)(config);
        }
        return _this;
    }
    Object.defineProperty(IfElse.prototype, "reportName", {
        get: function () {
            return "Templ:".concat(this.config.name ? this.config.name : '');
        },
        enumerable: false,
        configurable: true
    });
    IfElse.prototype.toString = function () {
        return '[pipeline IfElse]';
    };
    IfElse.prototype.compile = function (rebuild) {
        var _this = this;
        if (rebuild === void 0) { rebuild = false; }
        var run = function (err, context, done) {
            if (typeof _this.config.condition == 'function') {
                (0, execute_validate_1.execute_validate)(_this.config.condition, context, (function (err, condition) {
                    if (condition) {
                        if (_this.config.success) {
                            (0, run_or_execute_1.run_or_execute)(_this.config.success, err, context, done);
                        }
                    }
                    else {
                        if (_this.config.failed) {
                            (0, run_or_execute_1.run_or_execute)(_this.config.failed, err, context, done);
                        }
                    }
                }));
            }
            else if (typeof _this.config.condition == 'boolean') {
                if (_this.config.condition) {
                    if (_this.config.success) {
                        (0, run_or_execute_1.run_or_execute)(_this.config.success, err, context, done);
                    }
                }
                else {
                    if (_this.config.failed) {
                        (0, run_or_execute_1.run_or_execute)(_this.config.failed, err, context, done);
                    }
                }
            }
            else {
                if (_this.config.success) {
                    (0, run_or_execute_1.run_or_execute)(_this.config.success, err, context, done);
                }
                else if (_this.config.failed) {
                    (0, run_or_execute_1.run_or_execute)(_this.config.failed, err, context, done);
                }
                else {
                    done(err, context);
                }
            }
        };
        this.run = run;
        return _super.prototype.compile.call(this, rebuild);
    };
    return IfElse;
}(stage_1.Stage));
exports.IfElse = IfElse;
//# sourceMappingURL=ifelse.js.map