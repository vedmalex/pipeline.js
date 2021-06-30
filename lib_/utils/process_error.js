"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.process_error = void 0;
const ErrorList_1 = require("./ErrorList");
function process_error(err, done) {
    if (err instanceof Error) {
        done(err);
    }
    else if (typeof err == 'string') {
        done(ErrorList_1.CreateError(err));
    }
    else {
        done(ErrorList_1.CreateError(String(err)));
    }
}
exports.process_error = process_error;
//# sourceMappingURL=process_error.js.map