"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isComplexError = void 0;
const ComplexError_1 = require("./ComplexError");
function isComplexError(inp) {
    if (inp instanceof ComplexError_1.ComplexError) {
        return true;
    }
    else if (typeof inp == 'object' &&
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
//# sourceMappingURL=isComplexError.js.map