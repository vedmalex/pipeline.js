"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStageConfig = void 0;
const tslib_1 = require("tslib");
const ErrorList_1 = require("../ErrorList");
const ajv_1 = tslib_1.__importDefault(require("ajv"));
const ajv_errors_1 = tslib_1.__importDefault(require("ajv-errors"));
const ajv_formats_1 = tslib_1.__importDefault(require("ajv-formats"));
const ajv_keywords_1 = tslib_1.__importDefault(require("ajv-keywords"));
const RunPipelineFunction_1 = require("./RunPipelineFunction");
const EnsureFunction_1 = require("./EnsureFunction");
const Rescue_1 = require("./Rescue");
const ValidateFunction_1 = require("./ValidateFunction");
const getNameFrom_1 = require("./getNameFrom");
const isAnyStage_1 = require("./stage/isAnyStage");
function getStageConfig(config) {
    let result = {};
    if (typeof config == 'string') {
        result.name = config;
    }
    else if ((0, isAnyStage_1.isAnyStage)(config)) {
        return config;
    }
    else if ((0, RunPipelineFunction_1.isRunPipelineFunction)(config)) {
        result.run = config;
        result.name = (0, getNameFrom_1.getNameFrom)(result);
    }
    else {
        if (config.name) {
            result.name = config.name;
        }
        if ((0, Rescue_1.isRescue)(config.rescue)) {
            result.rescue = config.rescue;
        }
        if ((0, RunPipelineFunction_1.isRunPipelineFunction)(config.run)) {
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
        if ((0, ValidateFunction_1.isValidateFunction)(config.validate)) {
            result.validate = config.validate;
        }
        if ((0, EnsureFunction_1.isEnsureFunction)(config.ensure)) {
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
            result.name = (0, getNameFrom_1.getNameFrom)(config);
        }
    }
    return result;
}
exports.getStageConfig = getStageConfig;
//# sourceMappingURL=getStageConfig.js.map