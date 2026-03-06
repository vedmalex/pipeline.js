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
exports.Empty = void 0;
var stage_1 = require("./stage");
var types_1 = require("./utils/types");
var types_2 = require("./utils/types");
var Empty = (function (_super) {
    __extends(Empty, _super);
    function Empty(config) {
        var _this = _super.call(this) || this;
        var res = (0, types_2.getEmptyConfig)(config);
        if ((0, types_1.isAnyStage)(res)) {
            return res;
        }
        else {
            _this._config = res;
        }
        return _this;
    }
    Empty.prototype.toString = function () {
        return '[pipeline Empty]';
    };
    return Empty;
}(stage_1.Stage));
exports.Empty = Empty;
//# sourceMappingURL=empty.js.map