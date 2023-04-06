"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCompileFunction = void 0;
const is_async_function_1 = require("./is_async_function");
function isCompileFunction(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp == 'function' && inp.length <= 1;
}
exports.isCompileFunction = isCompileFunction;
//# sourceMappingURL=CompileFunction.js.map