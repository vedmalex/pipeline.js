"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRunPipelineFunction = exports.isCustomRun3Callback = exports.isCustomRun2Async = exports.isCustomRun2Callback = exports.isCustomRun1Sync = exports.isCustomRun1Async = exports.isCustomRun0Async = exports.isCustomRun0Sync = void 0;
const is_async_function_1 = require("./is_async_function");
function isCustomRun0Sync(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp === 'function' && inp.length === 0;
}
exports.isCustomRun0Sync = isCustomRun0Sync;
function isCustomRun0Async(inp) {
    return (0, is_async_function_1.is_async_function)(inp) && typeof inp === 'function' && inp.length === 0;
}
exports.isCustomRun0Async = isCustomRun0Async;
function isCustomRun1Async(inp) {
    return (0, is_async_function_1.is_async_function)(inp) && typeof inp === 'function' && inp.length === 1;
}
exports.isCustomRun1Async = isCustomRun1Async;
function isCustomRun1Sync(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp === 'function' && inp.length === 1;
}
exports.isCustomRun1Sync = isCustomRun1Sync;
function isCustomRun2Callback(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp === 'function' && inp.length === 2;
}
exports.isCustomRun2Callback = isCustomRun2Callback;
function isCustomRun2Async(inp) {
    return (0, is_async_function_1.is_async_function)(inp) && typeof inp === 'function' && inp.length === 2;
}
exports.isCustomRun2Async = isCustomRun2Async;
function isCustomRun3Callback(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp === 'function' && inp.length === 3;
}
exports.isCustomRun3Callback = isCustomRun3Callback;
function isRunPipelineFunction(inp) {
    return (isCustomRun0Async(inp) ||
        isCustomRun1Async(inp) ||
        isCustomRun1Sync(inp) ||
        isCustomRun2Async(inp) ||
        isCustomRun0Sync(inp) ||
        isCustomRun2Callback(inp) ||
        isCustomRun3Callback(inp));
}
exports.isRunPipelineFunction = isRunPipelineFunction;
//# sourceMappingURL=RunPipelineFunction.js.map