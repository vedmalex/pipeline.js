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
exports.RetryOnError = exports.getRetryOnErrorConfig = void 0;
var lodash_1 = require("lodash");
var context_1 = require("./context");
var stage_1 = require("./stage");
var ErrorList_1 = require("./utils/ErrorList");
var run_or_execute_1 = require("./utils/run_or_execute");
var types_1 = require("./utils/types");
function getRetryOnErrorConfig(config) {
    var res = (0, types_1.getStageConfig)(config);
    if (res instanceof stage_1.Stage) {
        return { stage: res };
    }
    else if (typeof config == 'object' && !(config instanceof stage_1.Stage)) {
        if (config.run && config.stage) {
            throw (0, ErrorList_1.CreateError)("don't use run and stage both");
        }
        if (config.run) {
            res.stage = config.run;
        }
        if (config.stage) {
            res.stage = config.stage;
        }
        if (config.backup) {
            res.backup = config.backup;
        }
        if (config.restore) {
            res.restore = config.restore;
        }
        if (config.retry) {
            if (typeof config.retry !== 'function') {
                config.retry *= 1;
            }
            res.retry = config.retry;
        }
        if (!res.retry)
            res.retry = 1;
    }
    else if (typeof config == 'function' && res.run) {
        res.stage = res.run;
        delete res.run;
    }
    return res;
}
exports.getRetryOnErrorConfig = getRetryOnErrorConfig;
var RetryOnError = (function (_super) {
    __extends(RetryOnError, _super);
    function RetryOnError(config) {
        var _this = _super.call(this) || this;
        if (config) {
            _this._config = getRetryOnErrorConfig(config);
        }
        return _this;
    }
    Object.defineProperty(RetryOnError.prototype, "reportName", {
        get: function () {
            return "Templ:".concat(this.config.name ? this.config.name : '');
        },
        enumerable: false,
        configurable: true
    });
    RetryOnError.prototype.toString = function () {
        return '[pipeline RetryOnError]';
    };
    RetryOnError.prototype.backupContext = function (ctx) {
        if (this.config.backup) {
            return this.config.backup(ctx);
        }
        else {
            if (context_1.Context.isContext(ctx)) {
                return ctx.toObject();
            }
            else {
                return (0, lodash_1.cloneDeep)(ctx);
            }
        }
    };
    RetryOnError.prototype.restoreContext = function (ctx, backup) {
        if (this.config.restore) {
            return this.config.restore(ctx, backup);
        }
        else {
            if (context_1.Context.isContext(ctx)) {
                for (var key in backup) {
                    ;
                    ctx[key] = backup[key];
                }
            }
            else {
                return backup;
            }
        }
    };
    RetryOnError.prototype.compile = function (rebuild) {
        var _this = this;
        if (rebuild === void 0) { rebuild = false; }
        var run = function (err, ctx, done) {
            var backup = _this.backupContext(ctx);
            var reachEnd = function (err, iter) {
                if (err) {
                    if (_this.config.retry instanceof Function) {
                        return !_this.config.retry(err, ctx, iter);
                    }
                    else {
                        return iter > _this.config.retry;
                    }
                }
                else {
                    return true;
                }
            };
            var iter = -1;
            var next = function (err, _ctx) {
                iter++;
                if (reachEnd(err, iter)) {
                    return done(err, (_ctx !== null && _ctx !== void 0 ? _ctx : ctx));
                }
                else {
                    var res = _this.restoreContext(_ctx !== null && _ctx !== void 0 ? _ctx : ctx, backup);
                    (0, run_or_execute_1.run_or_execute)(_this.config.stage, err, res !== null && res !== void 0 ? res : ctx, next);
                }
            };
            (0, run_or_execute_1.run_or_execute)(_this.config.stage, err, ctx, next);
        };
        this.run = run;
        return _super.prototype.compile.call(this, rebuild);
    };
    return RetryOnError;
}(stage_1.Stage));
exports.RetryOnError = RetryOnError;
//# sourceMappingURL=retryonerror.js.map