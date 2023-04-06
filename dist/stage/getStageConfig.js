"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStageConfig = exports.isAllowedStage = exports.isAnyStage = exports.StageSymbol = void 0;
const tslib_1 = require("tslib");
const ajv_1 = tslib_1.__importDefault(require("ajv"));
const ajv_errors_1 = tslib_1.__importDefault(require("ajv-errors"));
const ajv_formats_1 = tslib_1.__importDefault(require("ajv-formats"));
const ajv_keywords_1 = tslib_1.__importDefault(require("ajv-keywords"));
const types_1 = require("./types");
const errors_1 = require("./errors");
exports.StageSymbol = Symbol('stage');
function isAnyStage(obj) {
    return typeof obj === 'object' && obj !== null && exports.StageSymbol in obj;
}
exports.isAnyStage = isAnyStage;
function isAllowedStage(inp) {
    return (0, types_1.isRunPipelineFunction)(inp) || isAnyStage(inp) || typeof inp == 'object' || typeof inp == 'string';
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
    else if ((0, types_1.isRunPipelineFunction)(config)) {
        result.run = config;
        result.name = (0, types_1.getNameFrom)(result);
    }
    else {
        if (config.name) {
            result.name = config.name;
        }
        if ((0, types_1.isRescue)(config.rescue)) {
            result.rescue = config.rescue;
        }
        if ((0, types_1.isRunPipelineFunction)(config.run)) {
            result.run = config.run;
        }
        if (config.validate && config.schema) {
            throw (0, errors_1.CreateError)('use only one `validate` or `schema`');
        }
        if (config.ensure && config.schema) {
            throw (0, errors_1.CreateError)('use only one `ensure` or `schema`');
        }
        if (config.ensure && config.validate) {
            throw (0, errors_1.CreateError)('use only one `ensure` or `validate`');
        }
        if ((0, types_1.isValidateFunction)(config.validate)) {
            result.validate = config.validate;
        }
        if ((0, types_1.isEnsureFunction)(config.ensure)) {
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
                    throw (0, errors_1.CreateError)(ajv.errorsText(validate.errors));
                }
                else
                    return true;
            };
        }
        if (!config.name) {
            result.name = (0, types_1.getNameFrom)(config);
        }
    }
    return result;
}
exports.getStageConfig = getStageConfig;
//# sourceMappingURL=getStageConfig.js.map