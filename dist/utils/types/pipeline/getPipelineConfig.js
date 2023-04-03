"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPipelineConfig = void 0;
const ErrorList_1 = require("../../ErrorList");
const RunPipelineFunction_1 = require("../stage/RunPipelineFunction");
const getStageConfig_1 = require("../stage/getStageConfig");
const isAnyStage_1 = require("../stage/isAnyStage");
function getPipelineConfig(config) {
    var _a;
    if (Array.isArray(config)) {
        return {
            stages: config.map((item) => {
                if ((0, RunPipelineFunction_1.isRunPipelineFunction)(item)) {
                    return item;
                }
                else if ((0, isAnyStage_1.isAnyStage)(item)) {
                    return item;
                }
                else {
                    throw (0, ErrorList_1.CreateError)('not suitable type for array in pipeline');
                }
            }),
        };
    }
    else {
        const res = (0, getStageConfig_1.getStageConfig)(config);
        if ((0, isAnyStage_1.isAnyStage)(res)) {
            return { stages: [res] };
        }
        else if (typeof config == 'object' && !(0, isAnyStage_1.isAnyStage)(config)) {
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
exports.getPipelineConfig = getPipelineConfig;
//# sourceMappingURL=getPipelineConfig.js.map