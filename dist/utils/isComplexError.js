"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isComplexError = void 0;
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
//# sourceMappingURL=isComplexError.js.map