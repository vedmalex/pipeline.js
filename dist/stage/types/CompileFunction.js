"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCompileFunction = exports.CompileFunction = void 0;
const tslib_1 = require("tslib");
const z = tslib_1.__importStar(require("zod"));
exports.CompileFunction = z.function().args(z.boolean()).returns(z.function());
function isCompileFunction(inp) {
    return exports.CompileFunction.safeParse(inp).success;
}
exports.isCompileFunction = isCompileFunction;
//# sourceMappingURL=CompileFunction.js.map