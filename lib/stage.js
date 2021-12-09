"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stage = void 0;
var ErrorList_1 = require("./utils/ErrorList");
var types_1 = require("./utils/types");
var execute_ensure_1 = require("./utils/execute_ensure");
var execute_validate_1 = require("./utils/execute_validate");
var execute_rescue_1 = require("./utils/execute_rescue");
var execute_callback_1 = require("./utils/execute_callback");
var can_fix_error_1 = require("./utils/can_fix_error");
var execute_custom_run_1 = require("./utils/execute_custom_run");
var types_2 = require("./utils/types");
var Stage = (function () {
    function Stage(config) {
        if (config) {
            var res = (0, types_1.getStageConfig)(config);
            if (res instanceof Stage) {
                return res;
            }
            else {
                this._config = res;
            }
        }
        else {
            this._config = {};
        }
    }
    Object.defineProperty(Stage.prototype, "config", {
        get: function () {
            return this._config;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Stage.prototype, "reportName", {
        get: function () {
            return "STG:" + (this._config.name ? this._config.name : '');
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Stage.prototype, "name", {
        get: function () {
            var _a;
            return (_a = this._config.name) !== null && _a !== void 0 ? _a : '';
        },
        enumerable: false,
        configurable: true
    });
    Stage.prototype.runStageMethod = function (err_, err, ctx, context, stageToRun, callback) {
        if (err || err_) {
            if (this.config.run && !(0, can_fix_error_1.can_fix_error)(this.config.run)) {
                this.rescue((0, ErrorList_1.CreateError)([err, err_]), ctx !== null && ctx !== void 0 ? ctx : context, callback, function (rescuedContext) {
                    stageToRun(undefined, rescuedContext, callback);
                });
            }
            else {
                stageToRun((0, ErrorList_1.CreateError)([err, err_]), ctx !== null && ctx !== void 0 ? ctx : context, callback);
            }
        }
        else {
            stageToRun(undefined, ctx !== null && ctx !== void 0 ? ctx : context, callback);
        }
    };
    Stage.prototype.execute = function (_err, _context, _callback) {
        var _this = this;
        var _a;
        var err, context, __callback;
        if (arguments.length == 1) {
            context = _err;
        }
        else if (arguments.length == 2) {
            if (typeof _context == 'function') {
                context = _err;
                err = undefined;
                __callback = _context;
            }
            else {
                err = _err;
                context = _context;
            }
        }
        else {
            err = _err;
            context = _context;
            __callback = _callback;
        }
        if (!this.run) {
            this.run = this.compile();
        }
        else if (!((_a = this.config) === null || _a === void 0 ? void 0 : _a.run)) {
            if (!(0, types_2.isStageRun)(this.run)) {
                var legacy = this.run;
                this.run = (0, execute_custom_run_1.execute_custom_run)(legacy);
            }
        }
        var stageToRun = this.run.bind(this);
        if (!__callback) {
            return new Promise(function (res, rej) {
                _this.execute(err, context, function (err, ctx) {
                    if (err)
                        rej(err);
                    else
                        res(ctx);
                });
            });
        }
        else {
            var back_1 = __callback;
            process.nextTick(function () {
                var sucess = function (ret) {
                    return back_1(undefined, ret !== null && ret !== void 0 ? ret : context);
                };
                var fail = function (err) {
                    return back_1(err, context);
                };
                var callback = function (err, _ctx) {
                    if (err) {
                        _this.rescue(err, _ctx, fail, sucess);
                    }
                    else {
                        back_1(err, _ctx);
                    }
                };
                if (err && _this._config.run && !(0, can_fix_error_1.can_fix_error)(_this._config.run)) {
                    _this.rescue(err, context, fail, sucess);
                }
                else {
                    if (_this.config.ensure) {
                        _this.ensure(_this.config.ensure, context, function (err_, ctx) {
                            _this.runStageMethod(err, err_, ctx, context, stageToRun, callback);
                        });
                    }
                    else if (_this._config.validate) {
                        _this.validate(_this._config.validate, context, function (err_, ctx) {
                            _this.runStageMethod(err, err_, ctx, context, stageToRun, callback);
                        });
                    }
                    else {
                        stageToRun(undefined, context, callback);
                    }
                }
            });
        }
    };
    Stage.prototype.stage = function (err, context, callback) {
        var _this = this;
        var back = callback;
        var sucess = function (ret) {
            return back(undefined, ret !== null && ret !== void 0 ? ret : context);
        };
        var fail = function (err) { return back(err, context); };
        if (this._config.run) {
            if (context) {
                (0, execute_callback_1.execute_callback)(err, this._config.run, context, function (err, ctx) {
                    if (err) {
                        _this.rescue(err, ctx !== null && ctx !== void 0 ? ctx : context, fail, sucess);
                    }
                    else {
                        callback(undefined, ctx !== null && ctx !== void 0 ? ctx : context);
                    }
                });
            }
            else {
                callback(null, context);
            }
        }
        else {
            var retErr = [
                this.reportName + ' reports: run is not a function',
            ];
            if (err)
                retErr.push(err);
            this.rescue((0, ErrorList_1.CreateError)(retErr), context, fail, sucess);
        }
    };
    Stage.prototype.compile = function (rebuild) {
        if (rebuild === void 0) { rebuild = false; }
        var res;
        if (this.config.precompile) {
            this.config.precompile();
        }
        if (this._config.compile) {
            res = this._config.compile.call(this, rebuild);
        }
        else if (!this.run || rebuild) {
            res = this.stage;
        }
        else {
            if ((0, types_2.isStageRun)(this.run)) {
                res = this.run;
            }
            else {
                res = (0, execute_custom_run_1.execute_custom_run)(this.run);
            }
        }
        return res;
    };
    Stage.prototype.rescue = function (_err, context, fail, success) {
        var err;
        if (_err) {
            if (!(_err instanceof Error)) {
                err = (0, ErrorList_1.CreateError)(_err);
            }
            else {
                err = _err;
            }
        }
        else {
            err = null;
        }
        if (err && this._config.rescue) {
            (0, execute_rescue_1.execute_rescue)(this._config.rescue, err, context, function (_err) {
                if (_err) {
                    fail(_err);
                }
                else {
                    success(context);
                }
            });
        }
        else {
            if (err) {
                fail(err);
            }
            else {
                success(context);
            }
        }
    };
    Stage.prototype.toString = function () {
        return '[pipeline Stage]';
    };
    Stage.prototype.validate = function (validate, context, callback) {
        var _this = this;
        (0, execute_validate_1.execute_validate)(validate, context, function (err, result) {
            if (err) {
                callback(err, context);
            }
            else {
                if (result) {
                    if ('boolean' === typeof result) {
                        callback(undefined, context);
                    }
                    else if (Array.isArray(result)) {
                        callback((0, ErrorList_1.CreateError)(result));
                    }
                }
                else {
                    callback((0, ErrorList_1.CreateError)(_this.reportName + ' reports: T is invalid'));
                }
            }
        });
    };
    Stage.prototype.ensure = function (ensure, context, callback) {
        (0, execute_ensure_1.execute_ensure)(ensure, context, function (err, result) {
            callback(err, result !== null && result !== void 0 ? result : context);
        });
    };
    return Stage;
}());
exports.Stage = Stage;
//# sourceMappingURL=stage.js.map