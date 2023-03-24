"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNameFrom = exports.getStageConfig = exports.isAllowedStage = exports.isStageRun = exports.isEnsureFunction = exports.isEnsureCallback = exports.isEnsureAsync = exports.isEnsureSync = exports.isStageCallbackFunction = exports.isCallback3Callback = exports.isCallback2Async = exports.isCallback2Callback = exports.isCallback1Sync = exports.isCallback1Async = exports.isCallback0Async = exports.isCallback0Sync = exports.isValidate = exports.isValidateCallback = exports.isValidateAsync = exports.isValidateSync = exports.isRescue = exports.isRescue2Sync = exports.isRescue3Callback = exports.isRescue2ASync = exports.isRescue1ASync = exports.isRescue1Sync = exports.isRunPipelineFunction = exports.isCustomRun3Callback = exports.isCustomRun2Async = exports.isCustomRun2Callback = exports.isCustomRun1Sync = exports.isCustomRun1Async = exports.isCustomRun0Async = exports.isCustomRun0Sync = exports.isValidateFunction = exports.isSingleStageFunction = exports.is_thenable = exports.is_func3_async = exports.is_func2_async = exports.is_func1_async = exports.is_func0_async = exports.is_func3 = exports.is_func2 = exports.is_func1 = exports.is_func0 = exports.is_async = exports.is_func1Callback = exports.is_async_function = exports.isExternalCallback = exports.isCallback = void 0;
exports.getRetryOnErrorConfig = exports.getDoWhileConfig = exports.isAnyStage = exports.getIfElseConfig = exports.getTimeoutConfig = exports.getWrapConfig = exports.getEmptyConfig = exports.getParallelConfig = exports.getPipelinConfig = void 0;
const tslib_1 = require("tslib");
const stage_1 = require("../../stage");
const ErrorList_1 = require("../ErrorList");
const ajv_1 = tslib_1.__importDefault(require("ajv"));
const ajv_errors_1 = tslib_1.__importDefault(require("ajv-errors"));
const ajv_formats_1 = tslib_1.__importDefault(require("ajv-formats"));
const ajv_keywords_1 = tslib_1.__importDefault(require("ajv-keywords"));
const empty_run_1 = require("../empty_run");
function isCallback(inp) {
    if (typeof inp === 'function' && !is_async_function(inp)) {
        return inp.length <= 2;
    }
    else
        return false;
}
exports.isCallback = isCallback;
function isExternalCallback(inp) {
    if (typeof inp === 'function' && !is_async_function(inp)) {
        return inp.length <= 2;
    }
    else
        return false;
}
exports.isExternalCallback = isExternalCallback;
function is_async_function(inp) {
    var _a;
    if (typeof inp == 'function')
        return ((_a = inp === null || inp === void 0 ? void 0 : inp.constructor) === null || _a === void 0 ? void 0 : _a.name) == 'AsyncFunction';
    else
        return false;
}
exports.is_async_function = is_async_function;
function is_func1Callback(inp) {
    return typeof inp === 'function' && (inp === null || inp === void 0 ? void 0 : inp.length) == 1;
}
exports.is_func1Callback = is_func1Callback;
function is_async(inp) {
    return is_async_function(inp);
}
exports.is_async = is_async;
function is_func0(inp) {
    return typeof inp === 'function' && (inp === null || inp === void 0 ? void 0 : inp.length) === 0;
}
exports.is_func0 = is_func0;
function is_func1(inp) {
    return typeof inp === 'function' && (inp === null || inp === void 0 ? void 0 : inp.length) === 1;
}
exports.is_func1 = is_func1;
function is_func2(inp) {
    return typeof inp === 'function' && (inp === null || inp === void 0 ? void 0 : inp.length) === 2;
}
exports.is_func2 = is_func2;
function is_func3(inp) {
    return typeof inp === 'function' && (inp === null || inp === void 0 ? void 0 : inp.length) === 3;
}
exports.is_func3 = is_func3;
function is_func0_async(inp) {
    return is_async(inp) && (inp === null || inp === void 0 ? void 0 : inp.length) === 0;
}
exports.is_func0_async = is_func0_async;
function is_func1_async(inp) {
    return is_async(inp) && (inp === null || inp === void 0 ? void 0 : inp.length) === 1;
}
exports.is_func1_async = is_func1_async;
function is_func2_async(inp) {
    return is_async(inp) && (inp === null || inp === void 0 ? void 0 : inp.length) === 2;
}
exports.is_func2_async = is_func2_async;
function is_func3_async(inp) {
    return is_async(inp) && (inp === null || inp === void 0 ? void 0 : inp.length) === 3;
}
exports.is_func3_async = is_func3_async;
function is_thenable(inp) {
    return typeof inp == 'object' && 'then' in inp;
}
exports.is_thenable = is_thenable;
function isSingleStageFunction(inp) {
    return is_func2_async(inp) || is_func3(inp);
}
exports.isSingleStageFunction = isSingleStageFunction;
function isValidateFunction(inp) {
    return is_func1(inp) || is_func1_async(inp) || is_func2(inp);
}
exports.isValidateFunction = isValidateFunction;
function isCustomRun0Sync(inp) {
    return !is_async_function(inp) && typeof inp === 'function' && inp.length === 0;
}
exports.isCustomRun0Sync = isCustomRun0Sync;
function isCustomRun0Async(inp) {
    return is_async_function(inp) && typeof inp === 'function' && inp.length === 0;
}
exports.isCustomRun0Async = isCustomRun0Async;
function isCustomRun1Async(inp) {
    return is_async_function(inp) && typeof inp === 'function' && inp.length === 1;
}
exports.isCustomRun1Async = isCustomRun1Async;
function isCustomRun1Sync(inp) {
    return !is_async_function(inp) && typeof inp === 'function' && inp.length === 1;
}
exports.isCustomRun1Sync = isCustomRun1Sync;
function isCustomRun2Callback(inp) {
    return !is_async_function(inp) && typeof inp === 'function' && inp.length === 2;
}
exports.isCustomRun2Callback = isCustomRun2Callback;
function isCustomRun2Async(inp) {
    return is_async_function(inp) && typeof inp === 'function' && inp.length === 2;
}
exports.isCustomRun2Async = isCustomRun2Async;
function isCustomRun3Callback(inp) {
    return !is_async_function(inp) && typeof inp === 'function' && inp.length === 3;
}
exports.isCustomRun3Callback = isCustomRun3Callback;
function isRunPipelineFunction(inp) {
    return (isCustomRun0Async(inp) ||
        isCustomRun1Async(inp) ||
        isCustomRun1Sync(inp) ||
        isCustomRun2Async(inp) ||
        isCustomRun0Sync(inp) ||
        isCustomRun2Callback(inp) ||
        isCustomRun3Callback(inp));
}
exports.isRunPipelineFunction = isRunPipelineFunction;
function isRescue1Sync(inp) {
    return typeof inp == 'function' && inp.length == 1;
}
exports.isRescue1Sync = isRescue1Sync;
function isRescue1ASync(inp) {
    return is_async_function(inp) && typeof inp === 'function' && inp.length == 1;
}
exports.isRescue1ASync = isRescue1ASync;
function isRescue2ASync(inp) {
    return is_async_function(inp) && typeof inp === 'function' && inp.length == 2;
}
exports.isRescue2ASync = isRescue2ASync;
function isRescue3Callback(inp) {
    return typeof inp == 'function' && inp.length == 3;
}
exports.isRescue3Callback = isRescue3Callback;
function isRescue2Sync(inp) {
    return typeof inp == 'function' && inp.length == 2;
}
exports.isRescue2Sync = isRescue2Sync;
function isRescue(inp) {
    return (isRescue1ASync(inp) || isRescue1Sync(inp) || isRescue2ASync(inp) || isRescue3Callback(inp) || isRescue2Sync(inp));
}
exports.isRescue = isRescue;
function isValidateSync(inp) {
    return typeof inp == 'function' && inp.length == 1;
}
exports.isValidateSync = isValidateSync;
function isValidateAsync(inp) {
    return is_async_function(inp) && typeof inp === 'function' && inp.length == 1;
}
exports.isValidateAsync = isValidateAsync;
function isValidateCallback(inp) {
    return typeof inp == 'function' && inp.length == 3;
}
exports.isValidateCallback = isValidateCallback;
function isValidate(inp) {
    return isValidateAsync(inp) || isValidateSync(inp) || isValidateCallback(inp);
}
exports.isValidate = isValidate;
function isCallback0Sync(inp) {
    return !is_async_function(inp) && typeof inp === 'function' && inp.length === 0;
}
exports.isCallback0Sync = isCallback0Sync;
function isCallback0Async(inp) {
    return is_async_function(inp) && typeof inp === 'function' && inp.length === 0;
}
exports.isCallback0Async = isCallback0Async;
function isCallback1Async(inp) {
    return is_async_function(inp) && typeof inp === 'function' && inp.length === 1;
}
exports.isCallback1Async = isCallback1Async;
function isCallback1Sync(inp) {
    return !is_async_function(inp) && typeof inp === 'function' && inp.length === 1;
}
exports.isCallback1Sync = isCallback1Sync;
function isCallback2Callback(inp) {
    return !is_async_function(inp) && typeof inp === 'function' && inp.length === 2;
}
exports.isCallback2Callback = isCallback2Callback;
function isCallback2Async(inp) {
    return is_async_function(inp) && typeof inp === 'function' && inp.length === 2;
}
exports.isCallback2Async = isCallback2Async;
function isCallback3Callback(inp) {
    return !is_async_function(inp) && typeof inp === 'function' && inp.length === 3;
}
exports.isCallback3Callback = isCallback3Callback;
function isStageCallbackFunction(inp) {
    return (isCallback0Async(inp) ||
        isCallback1Async(inp) ||
        isCallback1Sync(inp) ||
        isCallback2Async(inp) ||
        isCallback0Sync(inp) ||
        isCallback2Callback(inp) ||
        isCallback3Callback(inp));
}
exports.isStageCallbackFunction = isStageCallbackFunction;
function isEnsureSync(inp) {
    return typeof inp == 'function' && inp.length == 1;
}
exports.isEnsureSync = isEnsureSync;
function isEnsureAsync(inp) {
    return is_async_function(inp) && typeof inp === 'function' && inp.length == 1;
}
exports.isEnsureAsync = isEnsureAsync;
function isEnsureCallback(inp) {
    return typeof inp == 'function' && inp.length == 3;
}
exports.isEnsureCallback = isEnsureCallback;
function isEnsureFunction(inp) {
    return isEnsureAsync(inp) || isEnsureSync(inp) || isEnsureCallback(inp);
}
exports.isEnsureFunction = isEnsureFunction;
function isStageRun(inp) {
    return typeof inp === 'function' && (inp === null || inp === void 0 ? void 0 : inp.length) == 3;
}
exports.isStageRun = isStageRun;
function isAllowedStage(inp) {
    return isRunPipelineFunction(inp) || isAnyStage(inp) || typeof inp == 'object' || typeof inp == 'string';
}
exports.isAllowedStage = isAllowedStage;
function getStageConfig(config) {
    let result = {};
    if (typeof config == 'string') {
        result.name = config;
    }
    else if (isAnyStage(config)) {
        return config;
    }
    else if (isRunPipelineFunction(config)) {
        result.run = config;
        result.name = getNameFrom(result);
    }
    else {
        if (config.name) {
            result.name = config.name;
        }
        if (isRescue(config.rescue)) {
            result.rescue = config.rescue;
        }
        if (isRunPipelineFunction(config.run)) {
            result.run = config.run;
        }
        if (config.validate && config.schema) {
            throw (0, ErrorList_1.CreateError)('use only one `validate` or `schema`');
        }
        if (config.ensure && config.schema) {
            throw (0, ErrorList_1.CreateError)('use only one `ensure` or `schema`');
        }
        if (config.ensure && config.validate) {
            throw (0, ErrorList_1.CreateError)('use only one `ensure` or `validate`');
        }
        if (isValidateFunction(config.validate)) {
            result.validate = config.validate;
        }
        if (isEnsureFunction(config.ensure)) {
            result.ensure = config.ensure;
        }
        if (config.compile) {
            result.compile = config.compile;
        }
        if (config.precompile) {
            result.precompile = config.precompile;
        }
        if (config.schema) {
            result.schema = config.schema;
            const ajv = new ajv_1.default({ allErrors: true });
            (0, ajv_formats_1.default)(ajv);
            (0, ajv_errors_1.default)(ajv, { singleError: true });
            (0, ajv_keywords_1.default)(ajv);
            const validate = ajv.compile(result.schema);
            result.validate = (ctx) => {
                if (!validate(ctx) && validate.errors) {
                    throw (0, ErrorList_1.CreateError)(ajv.errorsText(validate.errors));
                }
                else
                    return true;
            };
        }
        if (!config.name) {
            result.name = getNameFrom(config);
        }
    }
    return result;
}
exports.getStageConfig = getStageConfig;
function getNameFrom(config) {
    var _a;
    let result = '';
    if (!config.name && config.run) {
        var match = config.run.toString().match(/function\s*(\w+)\s*\(/);
        if (match && match[1]) {
            result = match[1];
        }
        else {
            result = config.run.toString();
        }
    }
    else {
        result = (_a = config.name) !== null && _a !== void 0 ? _a : '';
    }
    return result;
}
exports.getNameFrom = getNameFrom;
function getPipelinConfig(config) {
    var _a;
    if (Array.isArray(config)) {
        return {
            stages: config.map((item) => {
                if (isRunPipelineFunction(item)) {
                    return item;
                }
                else if (isAnyStage(item)) {
                    return item;
                }
                else {
                    throw (0, ErrorList_1.CreateError)('not suitable type for array in pipeline');
                }
            }),
        };
    }
    else {
        const res = getStageConfig(config);
        if (isAnyStage(res)) {
            return { stages: [res] };
        }
        else if (typeof config == 'object' && !isAnyStage(config)) {
            if (config.run && ((_a = config.stages) === null || _a === void 0 ? void 0 : _a.length) > 0) {
                throw (0, ErrorList_1.CreateError)(" don't use run and stage both ");
            }
            if (config.run) {
                res.stages = [config.run];
            }
            if (config.stages) {
                res.stages = config.stages;
            }
        }
        else if (typeof config == 'function' && res.run) {
            res.stages = [res.run];
            delete res.run;
        }
        if (!res.stages)
            res.stages = [];
        return res;
    }
}
exports.getPipelinConfig = getPipelinConfig;
function getParallelConfig(config) {
    const res = getStageConfig(config);
    if (isAnyStage(res) || isRunPipelineFunction(res)) {
        return { stage: res };
    }
    else if (typeof config == 'object' && !isAnyStage(config)) {
        const r = res;
        if (config.run && config.stage) {
            throw (0, ErrorList_1.CreateError)("don't use run and stage both");
        }
        if (config.split) {
            r.split = config.split;
        }
        if (config.combine) {
            r.combine = config.combine;
        }
        if (config.stage) {
            r.stage = config.stage;
        }
        if (config.run) {
            r.stage = config.run;
        }
    }
    else if (typeof config == 'function' && res.run) {
        res.stage = res.run;
        delete res.run;
    }
    return res;
}
exports.getParallelConfig = getParallelConfig;
function getEmptyConfig(config) {
    const res = getStageConfig(config);
    if (isAnyStage(res)) {
        return res;
    }
    else {
        res.run = empty_run_1.empty_run;
    }
    return res;
}
exports.getEmptyConfig = getEmptyConfig;
function getWrapConfig(config) {
    const res = getStageConfig(config);
    if (isAnyStage(res)) {
        return { stage: res };
    }
    else if (typeof config == 'object' && !isAnyStage(config)) {
        if (config.run && config.stage) {
            throw (0, ErrorList_1.CreateError)("don't use run and stage both");
        }
        if (config.run) {
            res.stage = config.run;
        }
        if (config.stage) {
            res.stage = config.stage;
        }
        if (config.finalize) {
            res.finalize = config.finalize;
        }
        if (config.prepare) {
            res.prepare = config.prepare;
        }
        res.prepare = config.prepare;
    }
    return res;
}
exports.getWrapConfig = getWrapConfig;
function getTimeoutConfig(config) {
    const res = getStageConfig(config);
    if (isAnyStage(res)) {
        return { stage: res };
    }
    else if (typeof config == 'object' && !isAnyStage(config)) {
        if (config.run && config.stage) {
            throw (0, ErrorList_1.CreateError)("don't use run and stage both");
        }
        if (config.run) {
            res.stage = config.run;
        }
        if (config.stage) {
            res.stage = config.stage;
        }
        res.timeout = config.timeout;
        res.overdue = config.overdue;
    }
    else if (typeof config == 'function' && res.run) {
        res.stage = res.run;
        delete res.run;
    }
    return res;
}
exports.getTimeoutConfig = getTimeoutConfig;
function getIfElseConfig(config) {
    const res = getStageConfig(config);
    if (isAnyStage(res)) {
        return { success: res };
    }
    else if (typeof config == 'object' && !isAnyStage(config)) {
        if (config.run && config.success) {
            throw (0, ErrorList_1.CreateError)("don't use run and stage both");
        }
        if (config.run) {
            res.success = config.run;
        }
        if (config.success) {
            res.success = config.success;
        }
        if (config.condition) {
            res.condition = config.condition;
        }
        else {
            res.condition = true;
        }
        if (config.failed) {
            res.failed = config.failed;
        }
        else {
            res.failed = empty_run_1.empty_run;
        }
    }
    else if (typeof config == 'function' && res.run) {
        res.success = res.run;
        res.failed = empty_run_1.empty_run;
        res.condition = true;
        delete res.run;
    }
    else {
        res.success = empty_run_1.empty_run;
    }
    return res;
}
exports.getIfElseConfig = getIfElseConfig;
function isAnyStage(obj) {
    return (0, stage_1.isStage)(obj);
}
exports.isAnyStage = isAnyStage;
function getDoWhileConfig(_config) {
    let config = {};
    if (isAnyStage(_config)) {
        config.stage = _config;
    }
    else if (typeof _config == 'function') {
        config.stage = _config;
    }
    else {
        if ((_config === null || _config === void 0 ? void 0 : _config.run) && (_config === null || _config === void 0 ? void 0 : _config.stage)) {
            throw (0, ErrorList_1.CreateError)('use or run or stage, not both');
        }
        if (_config === null || _config === void 0 ? void 0 : _config.stage) {
            config.stage = _config.stage;
        }
        if ((_config === null || _config === void 0 ? void 0 : _config.split) instanceof Function) {
            config.split = _config.split;
        }
        if ((_config === null || _config === void 0 ? void 0 : _config.reachEnd) instanceof Function) {
            config.reachEnd = _config.reachEnd;
        }
    }
    return config;
}
exports.getDoWhileConfig = getDoWhileConfig;
function getRetryOnErrorConfig(config) {
    const res = getStageConfig(config);
    if (isAnyStage(res)) {
        return { stage: res };
    }
    else if (typeof config == 'object' && !isAnyStage(config)) {
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
//# sourceMappingURL=types.js.map