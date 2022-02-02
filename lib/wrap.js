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
exports.Wrap = void 0;
var stage_1 = require("./stage");
var run_or_execute_1 = require("./utils/run_or_execute");
var types_1 = require("./utils/types");
var Wrap = (function (_super) {
    __extends(Wrap, _super);
    function Wrap(config) {
        var _this = _super.call(this) || this;
        if (config) {
            _this._config = (0, types_1.getWrapConfig)(config);
        }
        return _this;
    }
    Object.defineProperty(Wrap.prototype, "reportName", {
        get: function () {
            return "Wrap:" + (this.config.name ? this.config.name : '');
        },
        enumerable: false,
        configurable: true
    });
    Wrap.prototype.toString = function () {
        return '[pipeline Wrap]';
    };
    Wrap.prototype.compile = function (rebuild) {
        var _this = this;
        if (rebuild === void 0) { rebuild = false; }
        var run = function (err, context, done) {
            var ctx = _this.prepare(context);
            if (_this.config.stage) {
                (0, run_or_execute_1.run_or_execute)(_this.config.stage, err, ctx, function (err, retCtx) {
                    if (!err) {
                        var result = _this.finalize(context, retCtx !== null && retCtx !== void 0 ? retCtx : ctx);
                        done(undefined, result !== null && result !== void 0 ? result : context);
                    }
                    else {
                        done(err, context);
                    }
                });
            }
        };
        this.run = run;
        return _super.prototype.compile.call(this, rebuild);
    };
    Wrap.prototype.prepare = function (ctx) {
        var _a;
        if (this.config.prepare) {
            return (_a = this.config.prepare(ctx)) !== null && _a !== void 0 ? _a : ctx;
        }
        else {
            return ctx;
        }
    };
    Wrap.prototype.finalize = function (ctx, retCtx) {
        if (this.config.finalize) {
            return this.config.finalize(ctx, retCtx);
        }
        else {
            return ctx;
        }
    };
    return Wrap;
}(stage_1.Stage));
exports.Wrap = Wrap;
//# sourceMappingURL=wrap.js.map