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
exports.StageError = exports.ErrorList = exports.CreateError = void 0;
function CreateError(err) {
    if (typeof err == 'string') {
        return new Error(err);
    }
    if (typeof err == 'object') {
        if (err instanceof ErrorList || err instanceof Error) {
            return err;
        }
        if (Array.isArray(err)) {
            var result = err.filter(function (e) { return e; }).map(function (e) { return CreateError(e); });
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
var ErrorList = (function (_super) {
    __extends(ErrorList, _super);
    function ErrorList(_list) {
        var _this = _super.call(this, 'Complex Error') || this;
        if (Array.isArray(_list)) {
            var list = _list.filter(function (e) { return e; });
            if (list.length > 1) {
                _this.errors = list;
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
        return _this;
    }
    Object.defineProperty(ErrorList.prototype, "message", {
        get: function () {
            return "ComplexError:\n\t" + this.errors.map(function (e) { return e.message; }).join('\n');
        },
        enumerable: false,
        configurable: true
    });
    return ErrorList;
}(Error));
exports.ErrorList = ErrorList;
var StageError = (function (_super) {
    __extends(StageError, _super);
    function StageError(err) {
        var _this = _super.call(this, err.name) || this;
        _this.info = err;
        return _this;
    }
    return StageError;
}(Error));
exports.StageError = StageError;
//# sourceMappingURL=ErrorList.js.map