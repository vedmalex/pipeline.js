"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAllowedStage = void 0;
const RunPipelineFunction_1 = require("./RunPipelineFunction");
const isAnyStage_1 = require("./isAnyStage");
function isAllowedStage(inp) {
    return (0, RunPipelineFunction_1.isRunPipelineFunction)(inp) || (0, isAnyStage_1.isAnyStage)(inp) || typeof inp == 'object' || typeof inp == 'string';
}
exports.isAllowedStage = isAllowedStage;
//# sourceMappingURL=isAllowedStage.js.map