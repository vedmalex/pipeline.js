"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCallbackFunction = exports.CallbackFunction = void 0;
const tslib_1 = require("tslib");
const z = tslib_1.__importStar(require("zod"));
exports.CallbackFunction = z
    .function()
    .args(z.any(), z.any())
    .returns(z.void())
    .superRefine((value, ctx) => {
    if (value.length <= 2) {
        ctx;
    }
});
function isCallbackFunction(inp) {
    return exports.CallbackFunction.safeParse(inp).success;
}
exports.isCallbackFunction = isCallbackFunction;
//# sourceMappingURL=CallbackFunction.js.map