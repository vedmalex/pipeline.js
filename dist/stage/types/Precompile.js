"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPrecompile = exports.Precompile = void 0;
const tslib_1 = require("tslib");
const z = tslib_1.__importStar(require("zod"));
const is_async_function_1 = require("./is_async_function");
exports.Precompile = z.function().returns(z.void());
function isPrecompile(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp == 'function' && inp.length == 0;
}
exports.isPrecompile = isPrecompile;
//# sourceMappingURL=Precompile.js.map