"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorList = exports.CreateError = void 0;
function CreateError(err) {
    if (typeof err == 'string') {
        return new Error(err);
    }
    if (typeof err == 'object') {
        if (err instanceof ErrorList || err instanceof Error) {
            return err;
        }
        if (Array.isArray(err)) {
            const result = err.filter(e => e).map(e => CreateError(e));
            return new ErrorList(result);
        }
        else if (err.hasOwnProperty('message')) {
            return err;
        }
        else {
            return new Error(JSON.stringify(err));
        }
    }
}
exports.CreateError = CreateError;
class ErrorList extends Error {
    constructor(_list) {
        super('Complex Error');
        if (Array.isArray(_list)) {
            const list = _list.filter(e => e);
            if (list.length > 1) {
                this.errors = list;
            }
            else if ((list.length = 1)) {
                return list[0];
            }
            else {
                return null;
            }
        }
        else {
            return _list;
        }
    }
    get message() {
        return `ComplexError:\n\t${this.errors.map(e => e.message).join('\n')}`;
    }
}
exports.ErrorList = ErrorList;
//# sourceMappingURL=ErrorList.js.map