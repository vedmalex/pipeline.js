"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRunPipelineFunction = exports.isCustomRun3Callback = exports.isCustomRun2Async = exports.isCustomRun2Callback = exports.isCustomRun1Sync = exports.isCustomRun1Async = exports.isCustomRun0Async = exports.isCustomRun0Sync = exports.RunPipelineFunction = exports.CustomRun3Callback = exports.CustomRun2Callback = exports.CustomRun2Async = exports.CustomRun1Async = exports.CustomRun1Sync = exports.CustomRun0Async = exports.CustomRun0Sync = exports.CustomRun0SyncVoid = void 0;
const tslib_1 = require("tslib");
const is_async_function_1 = require("../is_async_function");
const z = tslib_1.__importStar(require("zod"));
exports.CustomRun0SyncVoid = z.function().args(z.undefined()).returns(z.undefined());
exports.CustomRun0Sync = z.function().args(z.undefined()).returns(z.any());
exports.CustomRun0Async = z.function().args(z.undefined()).returns(z.promise(z.any()));
exports.CustomRun1Sync = z.function().args(z.any()).returns(z.any());
exports.CustomRun1Async = z.function().args(z.any()).returns(z.promise(z.any()));
exports.CustomRun2Async = z.function().args(z.any(), z.any()).returns(z.promise(z.any()));
exports.CustomRun2Callback = z.function().args(z.any(), z.function().args(z.any(), z.any()).returns(z.undefined()));
exports.CustomRun3Callback = z
    .function()
    .args(z.any(), z.any(), z.function().args(z.any(), z.any()).returns(z.undefined()));
exports.RunPipelineFunction = z.union([
    exports.CustomRun0SyncVoid,
    exports.CustomRun0Sync,
    exports.CustomRun0Async,
    exports.CustomRun1Async,
    exports.CustomRun1Sync,
    exports.CustomRun2Callback,
    exports.CustomRun2Async,
    exports.CustomRun3Callback,
]);
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