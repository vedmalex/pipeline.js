"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stage = exports.isStage = exports.StageSymbol = void 0;
const ErrorList_1 = require("./utils/ErrorList");
const types_1 = require("./utils/types/types");
const context_1 = require("./context");
const can_fix_error_1 = require("./utils/can_fix_error");
const execute_callback_1 = require("./utils/execute_callback");
const execute_custom_run_1 = require("./utils/execute_custom_run");
const execute_ensure_1 = require("./utils/execute_ensure");
const execute_rescue_1 = require("./utils/execute_rescue");
const execute_validate_1 = require("./utils/execute_validate");
const types_2 = require("./utils/types/types");
exports.StageSymbol = Symbol('stage');
function isStage(obj) {
    return typeof obj === 'object' && obj !== null && exports.StageSymbol in obj;
}
exports.isStage = isStage;
class Stage {
    get config() {
        return this._config;
    }
    constructor(config) {
        this[exports.StageSymbol] = true;
        if (config) {
            let res = (0, types_1.getStageConfig)(config);
            if ((0, types_2.isAnyStage)(res)) {
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
    get reportName() {
        return `STG:${this._config.name ? this._config.name : ''}`;
    }
    get name() {
        var _a;
        return (_a = this._config.name) !== null && _a !== void 0 ? _a : '';
    }
    execute(_err, _context, _callback) {
        var _a, _b;
        let err, not_ensured_context, __callback;
        if (arguments.length == 1) {
            not_ensured_context = _err;
        }
        else if (arguments.length == 2) {
            if (typeof _context == 'function') {
                not_ensured_context = _err;
                err = undefined;
                __callback = _context;
            }
            else {
                err = _err;
                not_ensured_context = _context;
            }
        }
        else {
            err = _err;
            not_ensured_context = _context;
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
        const stageToRun = (_b = this.run) === null || _b === void 0 ? void 0 : _b.bind(this);
        const input_is_context = context_1.Context.isContext(not_ensured_context);
        let context = context_1.Context.ensure(not_ensured_context);
        if (input_is_context) {
            context[context_1.OriginalObject] = true;
        }
        if (!__callback) {
            return new Promise((res, rej) => {
                this.execute(err, context, (err, ctx) => {
                    if (err)
                        rej(err);
                    else {
                        if (input_is_context) {
                            res(ctx);
                        }
                        else {
                            if (context_1.Context.isContext(ctx)) {
                                res(ctx.original);
                            }
                            else {
                                res(ctx);
                            }
                        }
                    }
                });
            });
        }
        else {
            const back = (err, _ctx) => {
                if (input_is_context) {
                    __callback === null || __callback === void 0 ? void 0 : __callback(err, _ctx);
                }
                else {
                    if (context_1.Context.isContext(_ctx)) {
                        __callback === null || __callback === void 0 ? void 0 : __callback(err, _ctx.original);
                    }
                    else {
                        __callback === null || __callback === void 0 ? void 0 : __callback((0, ErrorList_1.CreateError)([err, new Error('context is always context object')]), _ctx);
                    }
                }
            };
            process.nextTick(() => {
                const sucess = (ret) => { var _a; return back(undefined, (_a = ret) !== null && _a !== void 0 ? _a : context); };
                const fail = (err) => back(err, context);
                const callback = (err, _ctx) => {
                    if (err) {
                        this.rescue(err, _ctx, fail, sucess);
                    }
                    else {
                        back(err, _ctx);
                    }
                };
                if (err && this._config.run && !(0, can_fix_error_1.can_fix_error)(this._config.run)) {
                    this.rescue(err, context, fail, sucess);
                }
                else {
                    if (this.config.ensure) {
                        this.ensure(this.config.ensure, context, (err_, ctx) => {
                            this.runStageMethod(err, err_, ctx, context, stageToRun, callback);
                        });
                    }
                    else if (this._config.validate) {
                        this.validate(this._config.validate, context, (err_, ctx) => {
                            this.runStageMethod(err, err_, ctx, context, stageToRun, callback);
                        });
                    }
                    else {
                        stageToRun === null || stageToRun === void 0 ? void 0 : stageToRun(undefined, context, callback);
                    }
                }
            });
        }
    }
    runStageMethod(err_, err, ctx, context, stageToRun, callback) {
        if (err || err_) {
            if (this.config.run && !(0, can_fix_error_1.can_fix_error)(this.config.run)) {
                this.rescue((0, ErrorList_1.CreateError)([err, err_]), ctx !== null && ctx !== void 0 ? ctx : context, callback, rescuedContext => {
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
    }
    stage(err, context, callback) {
        const back = callback;
        const sucess = (ret) => back(undefined, (ret !== null && ret !== void 0 ? ret : context));
        const fail = (err) => back(err, context);
        if (this._config.run) {
            if (context) {
                execute_callback_1.execute_callback.call(this, err, this._config.run, context, (err, ctx) => {
                    if (err) {
                        this.rescue(err, ctx !== null && ctx !== void 0 ? ctx : context, fail, sucess);
                    }
                    else {
                        callback(undefined, (ctx !== null && ctx !== void 0 ? ctx : context));
                    }
                });
            }
            else {
                callback(null, context);
            }
        }
        else {
            const retErr = [this.reportName + ' reports: run is not a function'];
            if (err)
                retErr.push(err);
            this.rescue((0, ErrorList_1.CreateError)(retErr), context, fail, sucess);
        }
    }
    compile(rebuild = false) {
        let res;
        if (this.config.precompile) {
            this.config.precompile();
        }
        if (this.config.compile) {
            res = this.config.compile.call(this, rebuild);
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
    }
    rescue(_err, context, fail, success) {
        let err;
        if (_err) {
            if (!(_err instanceof Error)) {
                err = (0, ErrorList_1.CreateError)(_err);
            }
            else {
                err = (0, ErrorList_1.CreateError)(_err);
            }
        }
        else {
            err = null;
        }
        if (err && this._config.rescue) {
            (0, execute_rescue_1.execute_rescue)(this._config.rescue, err, context, (_err) => {
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
    }
    toString() {
        return '[pipeline Stage]';
    }
    validate(validate, context, callback) {
        (0, execute_validate_1.execute_validate)(validate, context, (err, result) => {
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
                    callback((0, ErrorList_1.CreateError)(this.reportName + ' reports: T is invalid'));
                }
            }
        });
    }
    ensure(ensure, context, callback) {
        (0, execute_ensure_1.execute_ensure)(ensure, context, (err, result) => {
            callback(err, (result !== null && result !== void 0 ? result : context));
        });
    }
}
exports.Stage = Stage;
//# sourceMappingURL=stage.js.map