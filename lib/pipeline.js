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
        var run = function (err, context, done) {
            var i = -1;
            var next = function (err, ctx) {
                i += 1;
                if (!err && i < _this.config.stages.length) {
                    var st = _this.config.stages[i];
                    (0, run_or_execute_1.run_or_execute)(st, err, ctx !== null && ctx !== void 0 ? ctx : context, next);
                }
                else if (i >= _this.config.stages.length || err) {
                    done(err, ctx !== null && ctx !== void 0 ? ctx : context);
                }
            };
            next(err, context);
        };
        if (this.config.stages.length > 0) {
            this.run = run;
        }
        else {
            this.run = empty_run_1.empty_run;
        }
        return _super.prototype.compile.call(this, rebuild);
    };
    return Pipeline;
}(stage_1.Stage));
exports.Pipeline = Pipeline;
//# sourceMappingURL=pipeline.js.map