"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SingleStageFunction = exports.isSingleStageFunction = exports.isSingleStage3Function = exports.SingleStage3Function = exports.isSingleStageFunction2 = exports.SingleStage2Function = void 0;
const tslib_1 = require("tslib");
const z = tslib_1.__importStar(require("zod"));
const is_async_function_1 = require("./is_async_function");
exports.SingleStage2Function = z.function().args(z.unknown(), z.function()).returns(z.void());
function isSingleStageFunction2(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp == 'function' && inp.length == 2;
}
exports.isSingleStageFunction2 = isSingleStageFunction2;
exports.SingleStage3Function = z.function().args(z.unknown(), z.unknown(), z.function()).returns(z.void());
function isSingleStage3Function(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp == 'function' && inp.length == 3;
}
exports.isSingleStage3Function = isSingleStage3Function;
function isSingleStageFunction(inp) {
    return isSingleStage3Function(inp) || isSingleStageFunction2(inp);
}
exports.isSingleStageFunction = isSingleStageFunction;
exports.SingleStageFunction = z.union([exports.SingleStage2Function, exports.SingleStage3Function]);
//# sourceMappingURL=SingleStageFunction.js.map