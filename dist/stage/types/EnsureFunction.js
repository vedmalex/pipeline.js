"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEnsureFunction = exports.isEnsureCallback = exports.isEnsureAsync = exports.isEnsureSync = void 0;
const is_async_function_1 = require("./is_async_function");
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
//# sourceMappingURL=EnsureFunction.js.map