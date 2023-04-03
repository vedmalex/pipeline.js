"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEmptyConfig = void 0;
const stage_1 = require("../../stage");
function getEmptyConfig(config) {
    const res = (0, stage_1.getStageConfig)(config);
    if ((0, stage_1.isAnyStage)(res)) {
        return res;
    }
    else {
        res.run = stage_1.empty_run;
    }
    return res;
}
exports.getEmptyConfig = getEmptyConfig;
//# sourceMappingURL=getEmptyConfig.js.map