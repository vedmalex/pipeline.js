"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.process_error = void 0;
var ErrorList_1 = require("./ErrorList");
function process_error(err, done) {
    if ((0, ErrorList_1.isComplexError)(err)) {
        done(err);
    }
    else if (err instanceof Error) {
        done(new ErrorList_1.ComplexError(err));
    }
    else if (typeof err == 'string') {
        done((0, ErrorList_1.CreateError)(err));
    }
    else {
        done((0, ErrorList_1.CreateError)(String(err)));
    }
}
exports.process_error = process_error;
//# sourceMappingURL=process_error.js.map