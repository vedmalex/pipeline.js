"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCompileFunction = exports.CompileFunction = void 0;
const tslib_1 = require("tslib");
const z = tslib_1.__importStar(require("zod"));
const is_async_function_1 = require("./is_async_function");
exports.CompileFunction = z.function().args(z.boolean().optional()).returns(z.function());
function isCompileFunction(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp == 'function' && inp.length <= 1;
}
exports.isCompileFunction = isCompileFunction;
//# sourceMappingURL=CompileFunction.js.map