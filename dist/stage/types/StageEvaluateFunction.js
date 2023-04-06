"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEvaluateFunction = void 0;
const is_async_function_1 = require("./is_async_function");
function isEvaluateFunction(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp == 'function' && inp.length == 1;
}
exports.isEvaluateFunction = isEvaluateFunction;
//# sourceMappingURL=StageEvaluateFunction.js.map