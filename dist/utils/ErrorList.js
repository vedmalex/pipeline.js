"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplexError = exports.isComplexError = exports.CreateError = void 0;
function CreateError(err) {
    if (typeof err == 'string') {
        return new ComplexError(new Error(err));
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
                return new ComplexError(...result);
            }
            if (result.length === 1) {
                return result[0];
            }
        }
        else if (err) {
            if (isComplexError(err)) {
                return err;
            }
            else {
                return new ComplexError(err);
            }
        }
    }
}
exports.CreateError = CreateError;
function isComplexError(inp) {
    if (typeof inp == 'object' &&
        inp &&
        'isComplex' in inp &&
        'payload' in inp &&
        Array.isArray(inp.payload) &&
        inp.isComplex) {
        return true;
    }
    else {
        return false;
    }
}
exports.isComplexError = isComplexError;
class ComplexError extends Error {
    constructor(...payload) {
        super();
        this.payload = payload;
        this.isComplex = true;
    }
}
exports.ComplexError = ComplexError;
//# sourceMappingURL=ErrorList.js.map