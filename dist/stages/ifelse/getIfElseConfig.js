"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIfElseConfig = void 0;
const stage_1 = require("../../stage");
function getIfElseConfig(config) {
    const res = (0, stage_1.getStageConfig)(config);
    if ((0, stage_1.isAnyStage)(res)) {
        return { success: res };
    }
    else if (typeof config == 'object' && !(0, stage_1.isAnyStage)(config)) {
        if (config.run && config.success) {
            throw (0, stage_1.CreateError)("don't use run and stage both");
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
            res.failed = stage_1.empty_run;
        }
    }
    else if (typeof config == 'function' && res.run) {
        res.success = res.run;
        res.failed = stage_1.empty_run;
        res.condition = true;
        delete res.run;
    }
    else {
        res.success = stage_1.empty_run;
    }
    return res;
}
exports.getIfElseConfig = getIfElseConfig;
//# sourceMappingURL=getIfElseConfig.js.map