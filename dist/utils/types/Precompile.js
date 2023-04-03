"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPrecompile = exports.Precompile = void 0;
const tslib_1 = require("tslib");
const z = tslib_1.__importStar(require("zod"));
exports.Precompile = z.function().returns(z.void());
function isPrecompile(inp) {
    return exports.Precompile.safeParse(inp).success;
}
exports.isPrecompile = isPrecompile;
//# sourceMappingURL=Precompile.js.map