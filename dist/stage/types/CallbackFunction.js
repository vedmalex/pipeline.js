"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCallbackFunction = exports.CallbackFunctionWrap = exports.CallbackFunction = void 0;
const tslib_1 = require("tslib");
const z = tslib_1.__importStar(require("zod"));
const is_async_function_1 = require("./is_async_function");
exports.CallbackFunction = z.function().args(z.any().optional(), z.any().optional()).returns(z.void());
function CallbackFunctionWrap(inp) {
    if (isCallbackFunction(inp)) {
        return exports.CallbackFunction.implement(inp);
    }
    else {
        throw new Error('input not suitable for callback');
    }
}
exports.CallbackFunctionWrap = CallbackFunctionWrap;
function isCallbackFunction(inp) {
    return typeof inp === 'function' && !(0, is_async_function_1.is_async_function)(inp) && inp.length <= 2;
}
exports.isCallbackFunction = isCallbackFunction;
//# sourceMappingURL=CallbackFunction.js.map