"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stage = void 0;
const ErrorList_1 = require("./utils/ErrorList");
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const ajv_keywords_1 = __importDefault(require("ajv-keywords"));
const ajv_errors_1 = __importDefault(require("ajv-errors"));
const execute_ensure_1 = require("./utils/execute_ensure");
const execute_validate_1 = require("./utils/execute_validate");
const execute_rescue_1 = require("./utils/execute_rescue");
const execute_callback_1 = require("./utils/execute_callback");
const can_fix_error_1 = require("./utils/can_fix_error");
class Stage {
    constructor(config) {
        this._config = {};
        if (typeof config == 'string') {
            this._config.name = config;
        }
        else if (typeof config == 'function') {
            this._config.run = config;
        }
        else if (typeof config == 'object') {
            if (config.name) {
                this._config.name = config.name;
            }
            if (config.rescue) {
                this._config.rescue = config.rescue;
            }
            if (config.run) {
                this._config.run = config.run;
            }
            if (config.validate && config.schema) {
                throw ErrorList_1.CreateError('use only one `validate` or `schema`');
            }
            if (config.ensure && config.schema) {
                throw ErrorList_1.CreateError('use only one `ensure` or `schema`');
            }
            if (config.ensure && config.validate) {
                throw ErrorList_1.CreateError('use only one `ensure` or `validate`');
            }
            if (config.validate) {
                this._config.validate = config.validate;
            }
            if (config.ensure) {
                this._config.ensure = config.ensure;
            }
            if (config.compile) {
                this._config.compile = config.compile;
            }
            if (config.precompile) {
                this._config.precompile = config.precompile;
            }
            if (config.schema) {
                this._config.schema = config.schema;
                const ajv = new ajv_1.default({ allErrors: true });
                ajv_formats_1.default(ajv);
                ajv_errors_1.default(ajv, { singleError: true });
                ajv_keywords_1.default(ajv);
                const validate = ajv.compile(config.schema);
                this._config.validate = (ctx) => {
                    if (!validate(ctx) && validate.errors) {
                        throw ErrorList_1.CreateError(ajv.errorsText(validate.errors));
                    }
                    else
                        return true;
                };
            }
        }
        if (!this._config.name && this._config.run) {
            var match = this._config.run.toString().match(/function\s*(\w+)\s*\(/);
            if (match && match[1]) {
                this._config.name = match[1];
            }
            else {
                this._config.name = this._config.run.toString();
            }
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
            const callback = __callback;
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
                    else {
                        callback(undefined, result);
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
                    else {
                        callback(undefined, result);
                    }
                }
                else {
                    callback(ErrorList_1.CreateError(this.reportName + ' reports: T is invalid'));
                }
            }
        });
    }
}
exports.Stage = Stage;
//# sourceMappingURL=stage.js.map