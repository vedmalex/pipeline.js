"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run_callback_once = run_callback_once;
const ErrorList_1 = require("./ErrorList");
const errors_1 = require("./errors");
const TypeDetectors_1 = require("./TypeDetectors");
function run_callback_once(wrapee) {
    let called = false;
    const c = function (err, ctx) {
        if (!called) {
            called = true;
            wrapee(err, ctx);
        }
        else {
            const doubleCallErr = new Error(errors_1.ErrorMessage[errors_1.ErrorCode.ERR_CALLBACK_DOUBLE]);
            const errors = [err, doubleCallErr].filter((e) => (0, TypeDetectors_1.isError)(e));
            throw errors.length > 0
                ? (0, ErrorList_1.createError)(errors, errors_1.ErrorCode.ERR_CALLBACK_DOUBLE)
                : (0, ErrorList_1.createCodeError)(errors_1.ErrorCode.ERR_CALLBACK_DOUBLE);
        }
    };
    return c;
}
//# sourceMappingURL=run_callback_once.js.map