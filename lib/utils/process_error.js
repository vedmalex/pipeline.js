"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.process_error = process_error;
const ErrorList_1 = require("./ErrorList");
const errors_1 = require("./errors");
const TypeDetectors_1 = require("./TypeDetectors");
function process_error(err, done) {
    if ((0, ErrorList_1.isCleanError)(err)) {
        done(err);
    }
    else if ((0, TypeDetectors_1.isError)(err)) {
        done((0, ErrorList_1.createError)(err, errors_1.ErrorCode.ERR_STAGE_THROW));
    }
    else if (typeof err == 'string') {
        done((0, ErrorList_1.createError)(err, errors_1.ErrorCode.ERR_STAGE_THROW));
    }
    else {
        done((0, ErrorList_1.createError)(String(err), errors_1.ErrorCode.ERR_STAGE_THROW));
    }
}
//# sourceMappingURL=process_error.js.map