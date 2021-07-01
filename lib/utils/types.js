"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWrapConfig = exports.getEmptyConfig = exports.getParallelConfig = exports.getPipelinConfig = exports.getNameFrom = exports.getStageConfig = exports.isAllowedStage = exports.isEnsureFunction = exports.isValidateFunction = exports.isRescue = exports.isRunPipelineFunction = exports.isSingleStageFunction = exports.is_thenable = exports.is_func3_async = exports.is_func2_async = exports.is_func1_async = exports.is_func0_async = exports.is_func3 = exports.is_func2 = exports.is_func1 = exports.is_func0 = exports.is_async = void 0;
const stage_1 = require("../stage");
const ErrorList_1 = require("./ErrorList");
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const ajv_keywords_1 = __importDefault(require("ajv-keywords"));
const ajv_errors_1 = __importDefault(require("ajv-errors"));
function is_async(inp) {
    var _a;
    return ((_a = inp === null || inp === void 0 ? void 0 : inp.constructor) === null || _a === void 0 ? void 0 : _a.name) == 'AsyncFunction';
}
exports.is_async = is_async;
function is_func0(inp) {
    return (inp === null || inp === void 0 ? void 0 : inp.length) == 0;
}
exports.is_func0 = is_func0;
function is_func1(inp) {
    return (inp === null || inp === void 0 ? void 0 : inp.length) == 1;
}
exports.is_func1 = is_func1;
function is_func2(inp) {
    return (inp === null || inp === void 0 ? void 0 : inp.length) == 2;
}
exports.is_func2 = is_func2;
function is_func3(inp) {
    return (inp === null || inp === void 0 ? void 0 : inp.length) == 3;
}
exports.is_func3 = is_func3;
function is_func0_async(inp) {
    return is_async(inp) && is_func0(inp);
}
exports.is_func0_async = is_func0_async;
function is_func1_async(inp) {
    return is_async(inp) && is_func1(inp);
}
exports.is_func1_async = is_func1_async;
function is_func2_async(inp) {
    return is_async(inp) && is_func2(inp);
}
exports.is_func2_async = is_func2_async;
function is_func3_async(inp) {
    return is_async(inp) && is_func3(inp);
}
exports.is_func3_async = is_func3_async;
function is_thenable(inp) {
    return typeof inp == 'object' && inp.hasOwnProperty('then');
}
exports.is_thenable = is_thenable;
function isSingleStageFunction(inp) {
    return is_func2_async(inp) || is_func3(inp);
}
exports.isSingleStageFunction = isSingleStageFunction;
function isRunPipelineFunction(inp) {
    return (is_func0(inp) ||
        is_func0_async(inp) ||
        is_func1(inp) ||
        is_func1_async(inp) ||
        is_func2(inp) ||
        is_func2_async(inp) ||
        is_func3(inp));
}
exports.isRunPipelineFunction = isRunPipelineFunction;
function isRescue(inp) {
    return (is_func1(inp) ||
        is_func1_async(inp) ||
        is_func2(inp) ||
        is_func2_async(inp) ||
        is_func3(inp));
}
exports.isRescue = isRescue;
function isValidateFunction(inp) {
    return is_func1(inp) || is_func1_async(inp) || is_func2(inp);
}
exports.isValidateFunction = isValidateFunction;
function isEnsureFunction(inp) {
    return is_func1(inp) || is_func1_async(inp) || is_func2(inp);
}
exports.isEnsureFunction = isEnsureFunction;
function isAllowedStage(inp) {
    return (isRunPipelineFunction(inp) ||
        inp instanceof stage_1.Stage ||
        typeof inp == 'object' ||
        typeof inp == 'string');
}
exports.isAllowedStage = isAllowedStage;
function getStageConfig(config) {
    let result = {};
    if (typeof config == 'string') {
        result.name = config;
    }
    else if (config instanceof stage_1.Stage) {
        return config;
    }
    else if (isRunPipelineFunction(config)) {
        result.run = config;
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
            throw ErrorList_1.CreateError('use only one `validate` or `schema`');
        }
        if (config.ensure && config.schema) {
            throw ErrorList_1.CreateError('use only one `ensure` or `schema`');
        }
        if (config.ensure && config.validate) {
            throw ErrorList_1.CreateError('use only one `ensure` or `validate`');
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
            ajv_formats_1.default(ajv);
            ajv_errors_1.default(ajv, { singleError: true });
            ajv_keywords_1.default(ajv);
            const validate = ajv.compile(result.schema);
            result.validate = (ctx) => {
                if (!validate(ctx) && validate.errors) {
                    throw ErrorList_1.CreateError(ajv.errorsText(validate.errors));
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
            stages: config.map(item => {
                if (isRunPipelineFunction(item)) {
                    return item;
                }
                else if (item instanceof stage_1.Stage) {
                    return item;
                }
                else {
                    throw ErrorList_1.CreateError('not suitable type for array in pipelin');
                }
            }),
        };
    }
    else {
        const res = getStageConfig(config);
        if (res instanceof stage_1.Stage) {
            return { stages: [res] };
        }
        else if (typeof config == 'object' && !(config instanceof stage_1.Stage)) {
            if (config.run && ((_a = config.stages) === null || _a === void 0 ? void 0 : _a.length) > 0) {
                throw ErrorList_1.CreateError(" don't use run and stage both ");
            }
            if (config.run) {
                res.stages = [config.run];
            }
            if (config.stages) {
                res.stages = config.stages;
            }
        }
        return res;
    }
}
exports.getPipelinConfig = getPipelinConfig;
function getParallelConfig(config) {
    const res = getStageConfig(config);
    if (res instanceof stage_1.Stage) {
        return { stage: res };
    }
    else if (typeof config == 'object' && !(config instanceof stage_1.Stage)) {
        if (config.run && config.stage) {
            throw ErrorList_1.CreateError("don't use run and stage both");
        }
        res.split = config.split;
        res.combine = config.combine;
        if (config.stage) {
            res.stage = config.stage;
        }
        if (config.run) {
            res.stage = config.run;
        }
    }
    return res;
}
exports.getParallelConfig = getParallelConfig;
function getEmptyConfig(config) {
    const res = getStageConfig(config);
    if (res instanceof stage_1.Stage) {
        return res;
    }
    else {
        res.run = (err, context, callback) => callback(err, context);
    }
    return res;
}
exports.getEmptyConfig = getEmptyConfig;
function getWrapConfig(config) {
    const res = getStageConfig(config);
    if (res instanceof stage_1.Stage) {
        return { stage: res };
    }
    else if (typeof config == 'object' && !(config instanceof stage_1.Stage)) {
        if (config.run && config.stage) {
            throw ErrorList_1.CreateError("don't use run and stage both");
        }
        if (config.run) {
            res.stage = config.run;
        }
        if (config.stage) {
            res.stage = config.stage;
        }
        res.finalize = config.finalize;
        res.prepare = config.prepare;
    }
    return res;
}
exports.getWrapConfig = getWrapConfig;
//# sourceMappingURL=types.js.map