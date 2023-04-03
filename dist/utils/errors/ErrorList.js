"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplexError = void 0;
class ComplexError extends Error {
    constructor(...payload) {
        super();
        this.payload = payload;
        this.isComplex = true;
    }
}
exports.ComplexError = ComplexError;
//# sourceMappingURL=ErrorList.js.map