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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplexError = exports.isComplexError = exports.CreateError = void 0;
function CreateError(err) {
    if (typeof err == 'string') {
        return new ComplexError(new Error(err));
    }
    if (typeof err == 'object' && err !== null) {
        if (Array.isArray(err)) {
            var result_1 = [];
            err
                .filter(function (e) { return e; })
                .forEach(function (ler) {
                var res = CreateError(ler);
                if (res) {
                    if (res.payload) {
                        result_1.push.apply(result_1, res.payload);
                    }
                    else {
                        result_1.push(res);
                    }
                }
            });
            if (result_1.length > 1) {
                return new (ComplexError.bind.apply(ComplexError, __spreadArray([void 0], result_1, false)))();
            }
            if (result_1.length === 1) {
                return result_1[0];
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
    return inp.isComplex && Array.isArray(inp.payload);
}
exports.isComplexError = isComplexError;
var ComplexError = (function (_super) {
    __extends(ComplexError, _super);
    function ComplexError() {
        var payload = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            payload[_i] = arguments[_i];
        }
        var _this = this;
        debugger;
        _this = _super.call(this) || this;
        _this.payload = payload;
        _this.isComplex = true;
        return _this;
    }
    return ComplexError;
}(Error));
exports.ComplexError = ComplexError;
//# sourceMappingURL=ErrorList.js.map