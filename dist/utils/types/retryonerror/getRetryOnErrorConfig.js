"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRetryOnErrorConfig = void 0;
const ErrorList_1 = require("../../ErrorList");
const getStageConfig_1 = require("../stage/getStageConfig");
const isAnyStage_1 = require("../stage/isAnyStage");
function getRetryOnErrorConfig(config) {
    const res = (0, getStageConfig_1.getStageConfig)(config);
    if ((0, isAnyStage_1.isAnyStage)(res)) {
        return { stage: res };
    }
    else if (typeof config == 'object' && !(0, isAnyStage_1.isAnyStage)(config)) {
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
//# sourceMappingURL=getRetryOnErrorConfig.js.map