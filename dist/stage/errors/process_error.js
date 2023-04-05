"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.process_error = void 0;
const isComplexError_1 = require("./isComplexError");
const CreateError_1 = require("./CreateError");
function process_error(err, done) {
    if ((0, isComplexError_1.isComplexError)(err)) {
        done(err);
    }
    else {
        done((0, CreateError_1.CreateError)(err));
    }
}
exports.process_error = process_error;
//# sourceMappingURL=process_error.js.map