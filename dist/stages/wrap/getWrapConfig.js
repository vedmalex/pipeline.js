"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWrapConfig = void 0;
const stage_1 = require("../../stage");
function getWrapConfig(config) {
    const res = (0, stage_1.getStageConfig)(config);
    if ((0, stage_1.isAnyStage)(res)) {
        return { stage: res };
    }
    else if (typeof config == 'object' && !(0, stage_1.isAnyStage)(config)) {
        if (config.run && config.stage) {
            throw (0, stage_1.CreateError)("don't use run and stage both");
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
//# sourceMappingURL=getWrapConfig.js.map