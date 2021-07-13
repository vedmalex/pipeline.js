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
            var callback_1 = function (err, _ctx) {
                if (err) {
                    _this.rescue(err, _ctx, __callback);
                }
                else {
                    __callback === null || __callback === void 0 ? void 0 : __callback(err, _ctx);
                }
            };
            if (err && this._config.run && !(0, can_fix_error_1.can_fix_error)(this._config.run)) {
                this.rescue(err, context, callback_1);
            }
            else {
                if (this.config.ensure) {
                    this.ensure(this.config.ensure, context, function (err_, ctx) {
                        var _a, _b;
                        if (err || err_) {
                            if (_this._config.run && !(0, can_fix_error_1.can_fix_error)(_this._config.run)) {
                                _this.rescue((0, ErrorList_1.CreateError)([err, err_]), ctx !== null && ctx !== void 0 ? ctx : context, callback_1);
                            }
                            else {
                                (_a = _this.run) === null || _a === void 0 ? void 0 : _a.call(_this, (0, ErrorList_1.CreateError)([err, err_]), ctx !== null && ctx !== void 0 ? ctx : context, callback_1);
                            }
                        }
                        else {
                            (_b = _this.run) === null || _b === void 0 ? void 0 : _b.call(_this, undefined, ctx !== null && ctx !== void 0 ? ctx : context, callback_1);
                        }
                    });
                }
                else if (this._config.validate) {
                    this.validate(this._config.validate, context, function (err_, ctx) {
                        var _a, _b;
                        if (err || err_) {
                            if (_this._config.run && !(0, can_fix_error_1.can_fix_error)(_this._config.run)) {
                                _this.rescue((0, ErrorList_1.CreateError)([err, err_]), ctx !== null && ctx !== void 0 ? ctx : context, callback_1);
                            }
                            else {
                                (_a = _this.run) === null || _a === void 0 ? void 0 : _a.call(_this, (0, ErrorList_1.CreateError)([err, err_]), ctx !== null && ctx !== void 0 ? ctx : context, callback_1);
                            }
                        }
                        else {
                            (_b = _this.run) === null || _b === void 0 ? void 0 : _b.call(_this, undefined, ctx !== null && ctx !== void 0 ? ctx : context, callback_1);
                        }
                    });
                }
                else {
                    (_a = this.run) === null || _a === void 0 ? void 0 : _a.call(this, undefined, context, callback_1);
                }
            }
        }
    };
    Stage.prototype.stage = function (err, context, callback) {
        var _this = this;
        if (this._config.run) {
            (0, execute_callback_1.execute_callback)(err, this._config.run, context, function (err) {
                if (err) {
                    _this.rescue(err, context, callback);
                }
                else {
                    callback(undefined, context);
                }
            });
        }
        else {
            this.rescue((0, ErrorList_1.CreateError)([this.reportName + ' reports: run is not a function', err]), context, callback);
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
            res = this.run;
        }
        return res;
    };
    Stage.prototype.rescue = function (err, context, callback) {
        if (err && !(err instanceof Error)) {
            if (typeof err == 'string')
                err = (0, ErrorList_1.CreateError)(err);
        }
        if (err && this._config.rescue) {
            (0, execute_rescue_1.execute_rescue)(this._config.rescue, err, context, function (_err) {
                callback(_err, context);
            });
        }
        else {
            callback(err, context);
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