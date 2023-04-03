"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStage = void 0;
const stage_1 = require("../stage");
function isStage(obj) {
    return typeof obj === 'object' && obj !== null && stage_1.StageSymbol in obj;
}
exports.isStage = isStage;
//# sourceMappingURL=isStage.js.map