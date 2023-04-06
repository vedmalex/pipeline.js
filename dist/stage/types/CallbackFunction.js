"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCallbackFunction = void 0;
const is_async_function_1 = require("./is_async_function");
function isCallbackFunction(inp) {
    return typeof inp === 'function' && !(0, is_async_function_1.is_async_function)(inp) && inp.length <= 2;
}
exports.isCallbackFunction = isCallbackFunction;
//# sourceMappingURL=CallbackFunction.js.map