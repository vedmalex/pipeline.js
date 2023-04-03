"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnsureFunction = exports.isEnsureFunction = exports.isEnsureCallback = exports.isEnsureAsync = exports.isEnsureSync = exports.EnsureCallback = exports.EnsureAsync = exports.EnsureSync = void 0;
const tslib_1 = require("tslib");
const z = tslib_1.__importStar(require("zod"));
const CallbackFunction_1 = require("./CallbackFunction");
exports.EnsureSync = z.function().args(z.any()).returns(z.any());
exports.EnsureAsync = z.function().args(z.any()).returns(z.promise(z.any()));
exports.EnsureCallback = z.function().args(z.any(), CallbackFunction_1.CallbackFunction).returns(z.undefined());
function isEnsureSync(inp) {
    return exports.EnsureAsync.safeParse(inp).success;
}
exports.isEnsureSync = isEnsureSync;
function isEnsureAsync(inp) {
    return exports.EnsureAsync.safeParse(inp).success;
}
exports.isEnsureAsync = isEnsureAsync;
function isEnsureCallback(inp) {
    return exports.EnsureCallback.safeParse(inp).success;
}
exports.isEnsureCallback = isEnsureCallback;
function isEnsureFunction(inp) {
    return isEnsureAsync(inp) || isEnsureSync(inp) || isEnsureCallback(inp);
}
exports.isEnsureFunction = isEnsureFunction;
exports.EnsureFunction = z.union([exports.EnsureSync, exports.EnsureAsync, exports.EnsureCallback]);
//# sourceMappingURL=EnsureFunction.js.map