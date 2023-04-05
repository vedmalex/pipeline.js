"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnsureFunction = exports.isEnsureFunction = exports.isEnsureCallback = exports.isEnsureAsync = exports.isEnsureSync = exports.EnsureCallback = exports.EnsureAsync = exports.EnsureSync = void 0;
const tslib_1 = require("tslib");
const z = tslib_1.__importStar(require("zod"));
const CallbackFunction_1 = require("./CallbackFunction");
const is_async_function_1 = require("./is_async_function");
exports.EnsureSync = z.function().args(z.any()).returns(z.any());
exports.EnsureAsync = z.function().args(z.any()).returns(z.promise(z.any()));
exports.EnsureCallback = z.function().args(z.any(), CallbackFunction_1.CallbackFunctionValidator).returns(z.undefined());
function isEnsureSync(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp == 'function' && inp.length === 1;
}
exports.isEnsureSync = isEnsureSync;
function isEnsureAsync(inp) {
    return (0, is_async_function_1.is_async_function)(inp) && typeof inp == 'function' && inp.length === 1;
}
exports.isEnsureAsync = isEnsureAsync;
function isEnsureCallback(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp == 'function' && inp.length === 2;
}
exports.isEnsureCallback = isEnsureCallback;
function isEnsureFunction(inp) {
    return isEnsureAsync(inp) || isEnsureSync(inp) || isEnsureCallback(inp);
}
exports.isEnsureFunction = isEnsureFunction;
exports.EnsureFunction = z.union([exports.EnsureSync, exports.EnsureAsync, exports.EnsureCallback]);
//# sourceMappingURL=EnsureFunction.js.map