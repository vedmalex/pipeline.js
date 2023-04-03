"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.is_async_function = void 0;
function is_async_function(inp) {
    var _a;
    if (typeof inp == 'function')
        return ((_a = inp === null || inp === void 0 ? void 0 : inp.constructor) === null || _a === void 0 ? void 0 : _a.name) == 'AsyncFunction';
    else
        return false;
}
exports.is_async_function = is_async_function;
//# sourceMappingURL=is_async_function.js.map