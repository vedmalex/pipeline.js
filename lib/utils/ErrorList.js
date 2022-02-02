"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateError = void 0;
function CreateError(err) {
    if (typeof err == 'string') {
        return new Error(err);
    }
    if (typeof err == 'object') {
        if (Array.isArray(err)) {
            var result_1 = [];
            err
                .filter(function (e) { return e; })
                .forEach(function (ler) {
                var res = CreateError(ler);
                if (res) {
                    if ('isComplex' in res && res.errors) {
                        result_1.push.apply(result_1, res.errors);
                    }
                    else {
                        result_1.push(res);
                    }
                }
            });
            if (result_1.length > 1) {
                return ErrorList(result_1);
            }
            if (result_1.length === 1) {
                return result_1[0];
            }
        }
        else {
            return err;
        }
    }
    new Error('unknown error, see console for details');
}
exports.CreateError = CreateError;
function ErrorList(_list) {
    var errors;
    var list = _list.filter(function (e) { return e; });
    if (list.length > 1) {
        errors = list;
    }
    else if ((list.length = 1)) {
        return list[0];
    }
    else {
        return null;
    }
    var error = errors[0];
    error.errors = errors;
    error.isComplex = true;
    return error;
}
//# sourceMappingURL=ErrorList.js.map