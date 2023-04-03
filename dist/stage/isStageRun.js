"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStageRun = void 0;
function isStageRun(inp) {
    return typeof inp === 'function' && (inp === null || inp === void 0 ? void 0 : inp.length) == 3;
}
exports.isStageRun = isStageRun;
//# sourceMappingURL=isStageRun.js.map