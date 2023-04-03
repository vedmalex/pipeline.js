"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidateFunction = exports.ValidateFunction = exports.isValidateFunction2Sync = exports.ValidateFunction2Sync = exports.isValidateFunction1Thenable = exports.ValidateFunction1Thenable = exports.isValidateFunction1Async = exports.ValidateFunction1Async = exports.isValidateFunction1Sync = exports.ValidateFunction1Sync = exports.isValidateFunction0Sync = exports.ValidateFunction0Sync = void 0;
const tslib_1 = require("tslib");
const z = tslib_1.__importStar(require("zod"));
const CallbackFunction_1 = require("./types/CallbackFunction");
exports.ValidateFunction0Sync = z.function().returns(z.boolean());
function isValidateFunction0Sync(inp) {
    return exports.ValidateFunction0Sync.safeParse(inp).success;
}
exports.isValidateFunction0Sync = isValidateFunction0Sync;
exports.ValidateFunction1Sync = z.function().args(z.any()).returns(z.boolean());
function isValidateFunction1Sync(inp) {
    return exports.ValidateFunction1Sync.safeParse(inp).success;
}
exports.isValidateFunction1Sync = isValidateFunction1Sync;
exports.ValidateFunction1Async = z.function().args(z.any()).returns(z.promise(z.boolean()));
function isValidateFunction1Async(inp) {
    return exports.ValidateFunction1Async.safeParse(inp).success;
}
exports.isValidateFunction1Async = isValidateFunction1Async;
exports.ValidateFunction1Thenable = z.function().args(z.any()).returns(z.boolean());
function isValidateFunction1Thenable(inp) {
    return exports.ValidateFunction1Thenable.safeParse(inp).success;
}
exports.isValidateFunction1Thenable = isValidateFunction1Thenable;
exports.ValidateFunction2Sync = z.function().args(z.any(), CallbackFunction_1.CallbackFunction).returns(z.void());
function isValidateFunction2Sync(inp) {
    return exports.ValidateFunction2Sync.safeParse(inp).success;
}
exports.isValidateFunction2Sync = isValidateFunction2Sync;
exports.ValidateFunction = z.union([
    exports.ValidateFunction0Sync,
    exports.ValidateFunction1Sync,
    exports.ValidateFunction1Async,
    exports.ValidateFunction1Thenable,
    exports.ValidateFunction2Sync,
]);
function isValidateFunction(inp) {
    return exports.ValidateFunction.safeParse(inp).success;
}
exports.isValidateFunction = isValidateFunction;
//# sourceMappingURL=ValidateFunction.js.map