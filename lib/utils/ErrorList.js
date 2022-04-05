"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplexError = exports.CreateError = void 0;
function CreateError(err) {
    if (typeof err == 'string') {
        return new ComplexError({ message: err });
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
        else if (err) {
            return new ComplexError(err);
        }
        else {
            return err;
        }
    }
    new Error('unknown error, see console for details');
}
exports.CreateError = CreateError;
var ComplexError = (function (_super) {
    __extends(ComplexError, _super);
    function ComplexError(payload) {
        var _this = _super.call(this) || this;
        _this.payload = payload;
        _this.isComplex = true;
        Object.keys(payload).forEach(function (f) {
            _this[f] = payload[f];
        });
        return _this;
    }
    return ComplexError;
}(Error));
exports.ComplexError = ComplexError;
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
    return new ComplexError({ errors: errors });
}
//# sourceMappingURL=ErrorList.js.map