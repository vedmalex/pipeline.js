"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSingleStageFunction = exports.isSingleStage3Function = exports.isSingleStageFunction2 = void 0;
const is_async_function_1 = require("./is_async_function");
function isSingleStageFunction2(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp == 'function' && inp.length == 2;
}
exports.isSingleStageFunction2 = isSingleStageFunction2;
function isSingleStage3Function(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp == 'function' && inp.length == 3;
}
exports.isSingleStage3Function = isSingleStage3Function;
function isSingleStageFunction(inp) {
    return isSingleStage3Function(inp) || isSingleStageFunction2(inp);
}
exports.isSingleStageFunction = isSingleStageFunction;
//# sourceMappingURL=SingleStageFunction.js.map