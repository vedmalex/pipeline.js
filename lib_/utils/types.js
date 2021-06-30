"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.is_thenable = exports.is_func3_async = exports.is_func2_async = exports.is_func1_async = exports.is_func0_async = exports.is_func3 = exports.is_func2 = exports.is_func1 = exports.is_func0 = exports.is_async = exports.isIStage = void 0;
function isIStage(inp) {
    if (inp) {
        return (typeof inp.compile == 'function' &&
            typeof inp.execute == 'function' &&
            typeof inp.config == 'object');
    }
    else
        return false;
}
exports.isIStage = isIStage;
function is_async(inp) {
    var _a;
    return ((_a = inp === null || inp === void 0 ? void 0 : inp.constructor) === null || _a === void 0 ? void 0 : _a.name) == 'AsyncFunction';
}
exports.is_async = is_async;
function is_func0(inp) {
    return inp.length == 0;
}
exports.is_func0 = is_func0;
function is_func1(inp) {
    return inp.length == 1;
}
exports.is_func1 = is_func1;
function is_func2(inp) {
    return inp.length == 2;
}
exports.is_func2 = is_func2;
function is_func3(inp) {
    return inp.length == 3;
}
exports.is_func3 = is_func3;
function is_func0_async(inp) {
    return is_async(inp) && is_func0(inp);
}
exports.is_func0_async = is_func0_async;
function is_func1_async(inp) {
    return is_async(inp) && is_func1(inp);
}
exports.is_func1_async = is_func1_async;
function is_func2_async(inp) {
    return is_async(inp) && is_func2(inp);
}
exports.is_func2_async = is_func2_async;
function is_func3_async(inp) {
    return is_async(inp) && is_func3(inp);
}
exports.is_func3_async = is_func3_async;
function is_thenable(inp) {
    return typeof inp == 'object' && inp.hasOwnProperty('then');
}
exports.is_thenable = is_thenable;
//# sourceMappingURL=types.js.map