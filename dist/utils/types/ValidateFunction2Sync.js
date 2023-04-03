"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidateFunction2Sync = exports.ValidateFunction2Sync = void 0;
const tslib_1 = require("tslib");
const CallbackFunction_1 = require("./CallbackFunction");
const z = tslib_1.__importStar(require("zod"));
exports.ValidateFunction2Sync = z.function().args(z.any(), CallbackFunction_1.CallbackFunction).returns(z.void());
function isValidateFunction2Sync(inp) {
    return exports.ValidateFunction2Sync.safeParse(inp).success;
}
exports.isValidateFunction2Sync = isValidateFunction2Sync;
//# sourceMappingURL=ValidateFunction2Sync.js.map