"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.process_error_async = exports.process_error = void 0;
const ErrorList_1 = require("./errors/ErrorList");
const isComplexError_1 = require("./errors/isComplexError");
const CreateError_1 = require("./errors/CreateError");
function process_error(err, done) {
    if ((0, isComplexError_1.isComplexError)(err)) {
        done(err);
    }
    else if (err instanceof Error) {
        done(new ErrorList_1.ComplexError(err));
    }
    else if (typeof err == 'string') {
        done((0, CreateError_1.CreateError)(err));
    }
    else {
        done((0, CreateError_1.CreateError)(String(err)));
    }
}
exports.process_error = process_error;
function process_error_async(err) {
    return new Promise((resolve, reject) => {
        process_error(err, (err, ctx) => {
            if (err)
                reject(err);
            else
                resolve(ctx);
        });
    });
}
exports.process_error_async = process_error_async;
//# sourceMappingURL=process_error.js.map