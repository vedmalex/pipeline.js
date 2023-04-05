"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateError = void 0;
const ComplexError_1 = require("./ComplexError");
const isComplexError_1 = require("./isComplexError");
function CreateError(err) {
    if (typeof err == 'string') {
        return new ComplexError_1.ComplexError(new Error(err));
    }
    if (typeof err == 'object' && err !== null) {
        if (Array.isArray(err)) {
            let result = [];
            err
                .filter(e => e)
                .forEach(ler => {
                const res = CreateError(ler);
                if (res) {
                    if (res.payload) {
                        result.push(...res.payload);
                    }
                    else {
                        result.push(res);
                    }
                }
            });
            if (result.length > 1) {
                return new ComplexError_1.ComplexError(...result);
            }
            if (result.length === 1) {
                return result[0];
            }
        }
        else if (err) {
            if ((0, isComplexError_1.isComplexError)(err)) {
                return err;
            }
            else {
                return new ComplexError_1.ComplexError(err);
            }
        }
    }
}
exports.CreateError = CreateError;
//# sourceMappingURL=CreateError.js.map