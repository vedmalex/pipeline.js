"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stage = exports.StageSymbol = void 0;
exports.isStage = isStage;
const ErrorList_1 = require("./utils/ErrorList");
const errors_1 = require("./utils/errors");
const TypeDetectors_1 = require("./utils/TypeDetectors");
const types_1 = require("./utils/types");
const context_1 = require("./context");
const context_mode_1 = require("./context_mode");
const can_fix_error_1 = require("./utils/can_fix_error");
const execute_callback_1 = require("./utils/execute_callback");
const execute_custom_run_1 = require("./utils/execute_custom_run");
const execute_ensure_1 = require("./utils/execute_ensure");
const execute_rescue_1 = require("./utils/execute_rescue");
const execute_validate_1 = require("./utils/execute_validate");
const types_2 = require("./utils/types");
const withTimeout_1 = require("./utils/async/withTimeout");
const config_1 = require("./config");
const execution_signal_1 = require("./execution_signal");
const warn_once_1 = require("./utils/warn_once");
exports.StageSymbol = Symbol('stage');
function isStage(obj) {
    return !!(obj === null || obj === void 0 ? void 0 : obj[exports.StageSymbol]);
}
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
    runStageMethod(err_, err, ctx, context, stageToRun, callback) {
        if (err || err_) {
            const errors = [err, err_].filter((e) => (0, TypeDetectors_1.isError)(e));
            const combinedError = errors.length > 0 ? (0, ErrorList_1.createError)(errors) : (0, ErrorList_1.createCodeError)(errors_1.ErrorCode.ERR_UNKNOWN);
            if (this.config.run && !(0, can_fix_error_1.can_fix_error)({ run: this.config.run })) {
                this.rescue(combinedError, ctx !== null && ctx !== void 0 ? ctx : context, callback, rescuedContext => {
                    stageToRun(undefined, rescuedContext, callback);
                });
            }
            else {
                stageToRun(combinedError, ctx !== null && ctx !== void 0 ? ctx : context, callback);
            }
        }
        else {
            stageToRun(undefined, ctx !== null && ctx !== void 0 ? ctx : context, callback);
        }
    }
    execute(_err, _context, _callback, _options) {
        let err, not_ensured_context, __callback, options;
        const inputLooksLikeError = (0, TypeDetectors_1.isError)(_err);
        if (arguments.length == 1) {
            not_ensured_context = _err;
        }
        else if (arguments.length == 2) {
            if (typeof _context == 'function') {
                not_ensured_context = _err;
                err = undefined;
                __callback = _context;
            }
            else if (!inputLooksLikeError && (0, types_1.isExecutionOptions)(_context)) {
                not_ensured_context = _err;
                options = _context;
            }
            else {
                err = _err;
                not_ensured_context = _context;
            }
        }
        else if (arguments.length == 3) {
            if (typeof _context == 'function') {
                not_ensured_context = _err;
                err = undefined;
                __callback = _context;
                options = (0, types_1.isExecutionOptions)(_callback) ? _callback : undefined;
            }
            else if (typeof _callback == 'function') {
                err = _err;
                not_ensured_context = _context;
                __callback = _callback;
            }
            else if (inputLooksLikeError && (0, types_1.isExecutionOptions)(_callback)) {
                err = _err;
                not_ensured_context = _context;
                options = _callback;
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
            options = _options;
        }
        return this.executeResolved(err, not_ensured_context, __callback, options);
    }
    executeResolved(err, not_ensured_context, __callback, options) {
        var _a;
        var _b;
        if (!this.run) {
            this.run = this.compile();
        }
        else if (!((_a = this.config) === null || _a === void 0 ? void 0 : _a.run)) {
            if (!(0, types_2.isStageRun)(this.run)) {
                var legacy = this.run;
                this.run = (0, execute_custom_run_1.execute_custom_run)(legacy);
            }
        }
        const stageToRun = this.run.bind(this);
        const input_is_context = context_1.Context.isContext(not_ensured_context);
        const contextMode = (0, context_mode_1.getContextExecutionMode)();
        let context;
        if (input_is_context) {
            context = context_1.Context.ensure(not_ensured_context);
        }
        else if (contextMode === 'explicit') {
            context = not_ensured_context;
        }
        else {
            if (contextMode === 'warn') {
                (0, warn_once_1.warnOnce)('context-auto-wrap', '[pipeline.js] Context.ensure() auto-wrap is deprecated for plain objects. If you need fork/getParent/getRoot, call Context.ensure(ctx) before execute(). Plain objects will be passed through without wrapping in a future version.');
            }
            context = context_1.Context.ensure(not_ensured_context);
        }
        if (input_is_context) {
            ;
            context[context_1.OriginalObject] = true;
        }
        if (context_1.Context.isContext(context)) {
            ;
            context[context_1.CurrentStage] = this;
        }
        const publicExecutionSignal = options === null || options === void 0 ? void 0 : options.signal;
        const executionSignal = (_b = options === null || options === void 0 ? void 0 : options.signal) !== null && _b !== void 0 ? _b : (0, execution_signal_1.getExecutionSignal)(context);
        if (!__callback) {
            const { promise, resolve, reject } = Promise.withResolvers();
            const promiseCallback = ((err, ctx) => {
                if (err)
                    reject(err);
                else {
                    if (input_is_context) {
                        resolve(ctx);
                    }
                    else {
                        if (context_1.Context.isContext(ctx)) {
                            resolve(ctx.original);
                        }
                        else {
                            resolve(ctx);
                        }
                    }
                }
            });
            this.executeResolved((0, ErrorList_1.normalizeExecutionErrorInput)(err), context, promiseCallback, options);
            return promise;
        }
        else {
            const cleanupExecutionSignal = (0, execution_signal_1.bindExecutionSignal)(context, executionSignal);
            const cb = __callback;
            const hasTimeout = config_1.Config.timeout !== Infinity;
            let alreadyRun = false;
            let callbackExecuted = false;
            let abortListenerAttached = false;
            const detachAbortListener = () => {
                if (abortListenerAttached && publicExecutionSignal) {
                    publicExecutionSignal.removeEventListener('abort', onAbort);
                    abortListenerAttached = false;
                }
            };
            const finalizeExecution = () => {
                detachAbortListener();
                cleanupExecutionSignal();
            };
            const { promise, resolve, reject } = hasTimeout
                ? Promise.withResolvers()
                : { promise: undefined, resolve: () => { }, reject: (_e) => { } };
            const back = (err, _ctx) => {
                if (!alreadyRun) {
                    alreadyRun = true;
                    finalizeExecution();
                    try {
                        if (input_is_context) {
                            cb(err, _ctx);
                        }
                        else {
                            if (context_1.Context.isContext(_ctx)) {
                                cb(err, _ctx.original);
                            }
                            else {
                                cb(err, _ctx);
                            }
                        }
                        if (hasTimeout)
                            resolve();
                    }
                    catch (err) {
                        if (hasTimeout)
                            reject(err);
                    }
                }
            };
            const sucess = (ret) => back(undefined, ret !== null && ret !== void 0 ? ret : context);
            const fail = (err) => back(err, context);
            const onAbort = () => {
                callbackExecuted = true;
                fail((0, execution_signal_1.getPublicExecutionAbortError)(publicExecutionSignal === null || publicExecutionSignal === void 0 ? void 0 : publicExecutionSignal.reason));
            };
            if (publicExecutionSignal) {
                if (publicExecutionSignal.aborted) {
                    onAbort();
                    return Promise.resolve();
                }
                publicExecutionSignal.addEventListener('abort', onAbort, { once: true });
                abortListenerAttached = true;
            }
            const callback = ((err, _ctx) => {
                if (!callbackExecuted) {
                    callbackExecuted = true;
                    if (err) {
                        this.rescue(err, _ctx, fail, sucess);
                    }
                    else {
                        back(err, _ctx);
                    }
                }
            });
            if (err &&
                this._config.run &&
                !(0, can_fix_error_1.can_fix_error)({ run: this._config.run })) {
                this.rescue(err, context, fail, sucess);
            }
            else {
                if (this.config.ensure) {
                    this.ensure(this.config.ensure, context, ((err_, ctx) => {
                        this.runStageMethod(err, err_, ctx, context, stageToRun, callback);
                    }));
                }
                else if (this._config.validate) {
                    this.validate(this._config.validate, context, ((err_, ctx) => {
                        this.runStageMethod(err, err_, ctx, context, stageToRun, callback);
                    }));
                }
                else {
                    stageToRun((0, ErrorList_1.normalizeExecutionErrorInput)(err), context, callback);
                }
            }
            if (hasTimeout) {
                return (0, withTimeout_1.withTimeout)(promise, config_1.Config.timeout).catch(originalErr => {
                    const error = (0, ErrorList_1.createError)(originalErr || new Error(errors_1.ErrorMessage[errors_1.ErrorCode.ERR_STAGE_TIMEOUT]), errors_1.ErrorCode.ERR_STAGE_TIMEOUT);
                    if (alreadyRun || callbackExecuted) {
                        throw error;
                    }
                    else {
                        fail(error);
                    }
                }).finally(() => { alreadyRun = true; });
            }
            else {
                return Promise.resolve();
            }
        }
    }
    stage(err, context, callback) {
        const back = callback;
        const sucess = (ret) => back(undefined, ret !== null && ret !== void 0 ? ret : context);
        const fail = (err) => back(err, context);
        if (this._config.run) {
            if (context) {
                (0, execute_callback_1.execute_callback)(err, this._config.run, context, ((err, ctx) => {
                    if (err) {
                        this.rescue(err, ctx !== null && ctx !== void 0 ? ctx : context, fail, sucess);
                    }
                    else {
                        callback(undefined, ctx !== null && ctx !== void 0 ? ctx : context);
                    }
                }));
            }
            else {
                callback(null, context);
            }
        }
        else {
            const errorMessage = this.reportName + ' reports: ' + errors_1.ErrorMessage[errors_1.ErrorCode.ERR_NO_RUN];
            this.rescue((0, ErrorList_1.createError)(errorMessage, errors_1.ErrorCode.ERR_NO_RUN), context, fail, sucess);
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
            if (!(0, TypeDetectors_1.isError)(_err)) {
                err = (0, ErrorList_1.createError)(_err);
            }
            else {
                err = _err.isClean ? _err : (0, ErrorList_1.createError)(_err);
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
        (0, execute_validate_1.execute_validate)(validate, context, ((err, result) => {
            if (err) {
                callback(err, context);
            }
            else {
                if (result) {
                    if ('boolean' === typeof result) {
                        callback(undefined, context);
                    }
                    else if (Array.isArray(result)) {
                        callback((0, ErrorList_1.createError)(result));
                    }
                }
                else {
                    callback((0, ErrorList_1.createError)(this.reportName + ' reports: ' + errors_1.ErrorMessage[errors_1.ErrorCode.ERR_INVALID_CONTEXT], errors_1.ErrorCode.ERR_INVALID_CONTEXT));
                }
            }
        }));
    }
    ensure(ensure, context, callback) {
        (0, execute_ensure_1.execute_ensure)(ensure, context, ((err, result) => {
            callback(err, result !== null && result !== void 0 ? result : context);
        }));
    }
}
exports.Stage = Stage;
//# sourceMappingURL=stage.js.map