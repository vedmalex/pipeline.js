"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.process_error = process_error;
var ErrorList_1 = require("./ErrorList");
function process_error(err, done) {
    if ((0, ErrorList_1.isCleanError)(err)) {
        done(err);
    }
    else if (err instanceof Error) {
        done((0, ErrorList_1.createError)(err));
    }
    else if (typeof err == 'string') {
        done((0, ErrorList_1.createError)(err));
    }
    else {
        done((0, ErrorList_1.createError)(String(err)));
    }
}
//# sourceMappingURL=process_error.js.map