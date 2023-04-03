"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParallelConfig = void 0;
const stage_1 = require("../../stage");
function getParallelConfig(config) {
    const res = (0, stage_1.getStageConfig)(config);
    if ((0, stage_1.isAnyStage)(res) || (0, stage_1.isRunPipelineFunction)(res)) {
        return { stage: res };
    }
    else if (typeof config == 'object' && !(0, stage_1.isAnyStage)(config)) {
        const r = res;
        if (config.run && config.stage) {
            throw (0, stage_1.CreateError)("don't use run and stage both");
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
//# sourceMappingURL=getParallelConfig.js.map