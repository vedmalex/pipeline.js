"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SingleStageFunction = exports.isSingleStageFunction = exports.isSingleStage3Function = exports.SingleStage3Function = exports.isSingleStageFunction2 = exports.SingleStage2Function = void 0;
const tslib_1 = require("tslib");
const z = tslib_1.__importStar(require("zod"));
exports.SingleStage2Function = z.function().args(z.unknown(), z.function()).returns(z.void());
function isSingleStageFunction2(inp) {
    return exports.SingleStage2Function.safeParse(inp).success;
}
exports.isSingleStageFunction2 = isSingleStageFunction2;
exports.SingleStage3Function = z.function().args(z.unknown(), z.unknown(), z.function()).returns(z.void());
function isSingleStage3Function(inp) {
    return exports.SingleStage3Function.safeParse(inp).success;
}
exports.isSingleStage3Function = isSingleStage3Function;
function isSingleStageFunction(inp) {
    return exports.SingleStageFunction.safeParse(inp).success;
}
exports.isSingleStageFunction = isSingleStageFunction;
exports.SingleStageFunction = z.union([exports.SingleStage2Function, exports.SingleStage3Function]);
//# sourceMappingURL=SingleStageFunction.js.map