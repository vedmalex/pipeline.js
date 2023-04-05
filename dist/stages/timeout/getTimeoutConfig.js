"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTimeoutConfig = void 0;
const stage_1 = require("../../stage");
function getTimeoutConfig(config) {
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
//# sourceMappingURL=getTimeoutConfig.js.map