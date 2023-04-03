"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmptyConfig = void 0;
const empty_run_1 = require("../empty_run");
const getStageConfig_1 = require("./getStageConfig");
const isAnyStage_1 = require("./stage/isAnyStage");
function getEmptyConfig(config) {
    const res = (0, getStageConfig_1.getStageConfig)(config);
    if ((0, isAnyStage_1.isAnyStage)(res)) {
        return res;
    }
    else {
        res.run = empty_run_1.empty_run;
    }
    return res;
}
exports.getEmptyConfig = getEmptyConfig;
//# sourceMappingURL=getEmptyConfig.js.map