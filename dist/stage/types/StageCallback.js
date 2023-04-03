"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStageCallbackFunction = exports.isCallback3Callback = exports.isCallback2Async = exports.isCallback2Callback = exports.isCallback1Sync = exports.isCallback1Async = exports.isCallback0Async = exports.isCallback0Sync = void 0;
const is_async_function_1 = require("./is_async_function");
function isCallback0Sync(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp === 'function' && inp.length === 0;
}
exports.isCallback0Sync = isCallback0Sync;
function isCallback0Async(inp) {
    return (0, is_async_function_1.is_async_function)(inp) && typeof inp === 'function' && inp.length === 0;
}
exports.isCallback0Async = isCallback0Async;
function isCallback1Async(inp) {
    return (0, is_async_function_1.is_async_function)(inp) && typeof inp === 'function' && inp.length === 1;
}
exports.isCallback1Async = isCallback1Async;
function isCallback1Sync(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp === 'function' && inp.length === 1;
}
exports.isCallback1Sync = isCallback1Sync;
function isCallback2Callback(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp === 'function' && inp.length === 2;
}
exports.isCallback2Callback = isCallback2Callback;
function isCallback2Async(inp) {
    return (0, is_async_function_1.is_async_function)(inp) && typeof inp === 'function' && inp.length === 2;
}
exports.isCallback2Async = isCallback2Async;
function isCallback3Callback(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp === 'function' && inp.length === 3;
}
exports.isCallback3Callback = isCallback3Callback;
function isStageCallbackFunction(inp) {
    return (isCallback0Async(inp) ||
        isCallback1Async(inp) ||
        isCallback1Sync(inp) ||
        isCallback2Async(inp) ||
        isCallback0Sync(inp) ||
        isCallback2Callback(inp) ||
        isCallback3Callback(inp));
}
exports.isStageCallbackFunction = isStageCallbackFunction;
//# sourceMappingURL=StageCallback.js.map