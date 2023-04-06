"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidateFunction = exports.isValidateFunction2Sync = exports.isValidateFunction1Thenable = exports.isValidateFunction1Async = exports.isValidateFunction1Sync = exports.isValidateFunction0Sync = void 0;
const is_async_function_1 = require("./is_async_function");
function isValidateFunction0Sync(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp == 'function' && inp.length == 0;
}
exports.isValidateFunction0Sync = isValidateFunction0Sync;
function isValidateFunction1Sync(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp == 'function' && inp.length == 1;
}
exports.isValidateFunction1Sync = isValidateFunction1Sync;
function isValidateFunction1Async(inp) {
    return (0, is_async_function_1.is_async_function)(inp) && typeof inp == 'function' && inp.length == 1;
}
exports.isValidateFunction1Async = isValidateFunction1Async;
function isValidateFunction1Thenable(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp == 'function' && inp.length == 1;
}
exports.isValidateFunction1Thenable = isValidateFunction1Thenable;
function isValidateFunction2Sync(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp == 'function' && inp.length == 2;
}
exports.isValidateFunction2Sync = isValidateFunction2Sync;
function isValidateFunction(inp) {
    return (isValidateFunction0Sync(inp) ||
        isValidateFunction1Sync(inp) ||
        isValidateFunction1Async(inp) ||
        isValidateFunction1Thenable(inp) ||
        isValidateFunction2Sync(inp));
}
exports.isValidateFunction = isValidateFunction;
//# sourceMappingURL=ValidateFunction.js.map