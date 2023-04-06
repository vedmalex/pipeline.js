"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPrecompile = void 0;
const is_async_function_1 = require("./is_async_function");
function isPrecompile(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp == 'function' && inp.length == 0;
}
exports.isPrecompile = isPrecompile;
//# sourceMappingURL=Precompile.js.map