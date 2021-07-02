"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stage = void 0;
const ErrorList_1 = require("./utils/ErrorList");
const types_1 = require("./utils/types");
const execute_ensure_1 = require("./utils/execute_ensure");
const execute_validate_1 = require("./utils/execute_validate");
const execute_rescue_1 = require("./utils/execute_rescue");
const execute_callback_1 = require("./utils/execute_callback");
const can_fix_error_1 = require("./utils/can_fix_error");
const types_2 = require("./utils/types");
class Stage {
    constructor(config) {
        if (config) {
            let res = types_1.getStageConfig(config);
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
    get config() {
        return this._config;
    }
    get reportName() {
        return `STG:${this._config.name ? this._config.name : ''}`;
    }
    get name() {
        var _a;
        return (_a = this._config.name) !== null && _a !== void 0 ? _a : '';
    }
    execute(_err, _context, _callback) {
        var _a;
        let err, context, __callback;
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
            return new Promise((res, rej) => {
                this.execute(err, context, (err, ctx) => {
                    if (err)
                        rej(err);
                    else
                        res(ctx);
                });
            });
        }
        else {
            const callback = types_2.run_callback_once(__callback);
            if (err && this._config.run && !can_fix_error_1.can_fix_error(this._config.run)) {
                this.rescue(err, context, callback);
            }
            else {
                if (this.config.ensure) {
                    this.ensure(this.config.ensure, context, (err_, ctx) => {
                        var _a, _b;
                        if (err || err_) {
                            if (this._config.run && !can_fix_error_1.can_fix_error(this._config.run)) {
                                this.rescue(ErrorList_1.CreateError([err, err_]), ctx !== null && ctx !== void 0 ? ctx : context, callback);
                            }
                            else {
                                (_a = this.run) === null || _a === void 0 ? void 0 : _a.call(this, ErrorList_1.CreateError([err, err_]), ctx !== null && ctx !== void 0 ? ctx : context, callback);
                            }
                        }
                        else {
                            (_b = this.run) === null || _b === void 0 ? void 0 : _b.call(this, undefined, ctx !== null && ctx !== void 0 ? ctx : context, callback);
                        }
                    });
                }
                else if (this._config.validate) {
                    this.validate(this._config.validate, context, (err_, ctx) => {
                        var _a, _b;
                        if (err || err_) {
                            if (this._config.run && !can_fix_error_1.can_fix_error(this._config.run)) {
                                this.rescue(ErrorList_1.CreateError([err, err_]), ctx !== null && ctx !== void 0 ? ctx : context, callback);
                            }
                            else {
                                (_a = this.run) === null || _a === void 0 ? void 0 : _a.call(this, ErrorList_1.CreateError([err, err_]), ctx !== null && ctx !== void 0 ? ctx : context, callback);
                            }
                        }
                        else {
                            (_b = this.run) === null || _b === void 0 ? void 0 : _b.call(this, undefined, ctx !== null && ctx !== void 0 ? ctx : context, callback);
                        }
                    });
                }
                else {
                    (_a = this.run) === null || _a === void 0 ? void 0 : _a.call(this, undefined, context, callback);
                }
            }
        }
    }
    stage(err, context, callback) {
        if (this._config.run) {
            execute_callback_1.execute_callback(err, this._config.run, context, (err) => {
                if (err) {
                    this.rescue(err, context, callback);
                }
                else {
                    callback(undefined, context);
                }
            });
        }
        else {
            this.rescue(ErrorList_1.CreateError([this.reportName + ' reports: run is not a function', err]), context, callback);
        }
    }
    compile(rebuild = false) {
        let res;
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
    }
    rescue(err, context, callback) {
        if (err && !(err instanceof Error)) {
            if (typeof err == 'string')
                err = ErrorList_1.CreateError(err);
        }
        if (err && this._config.rescue) {
            execute_rescue_1.execute_rescue(this._config.rescue, err, context, (_err) => {
                callback(_err, context);
            });
        }
        else {
            callback(err, context);
        }
    }
    toString() {
        return '[pipeline Stage]';
    }
    validate(validate, context, callback) {
        execute_validate_1.execute_validate(validate, context, (err, result) => {
            if (err) {
                callback(err, context);
            }
            else {
                if (result) {
                    if ('boolean' === typeof result) {
                        callback(undefined, context);
                    }
                    else if (Array.isArray(result)) {
                        callback(ErrorList_1.CreateError(result));
                    }
                }
                else {
                    callback(ErrorList_1.CreateError(this.reportName + ' reports: T is invalid'));
                }
            }
        });
    }
    ensure(ensure, context, callback) {
        execute_ensure_1.execute_ensure(ensure, context, (err, result) => {
            callback(err, result !== null && result !== void 0 ? result : context);
        });
    }
}
exports.Stage = Stage;
//# sourceMappingURL=stage.js.map