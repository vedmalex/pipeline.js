"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRescue = exports.isRescue2Sync = exports.isRescue3Callback = exports.isRescue2ASync = exports.isRescue1ASync = exports.isRescue1Sync = void 0;
const is_async_function_1 = require("./is_async_function");
function isRescue1Sync(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp == 'function' && inp.length == 1;
}
exports.isRescue1Sync = isRescue1Sync;
function isRescue1ASync(inp) {
    return (0, is_async_function_1.is_async_function)(inp) && typeof inp == 'function' && inp.length == 1;
}
exports.isRescue1ASync = isRescue1ASync;
function isRescue2ASync(inp) {
    return (0, is_async_function_1.is_async_function)(inp) && typeof inp == 'function' && inp.length == 2;
}
exports.isRescue2ASync = isRescue2ASync;
function isRescue3Callback(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp == 'function' && inp.length == 3;
}
exports.isRescue3Callback = isRescue3Callback;
function isRescue2Sync(inp) {
    return !(0, is_async_function_1.is_async_function)(inp) && typeof inp == 'function' && inp.length == 2;
}
exports.isRescue2Sync = isRescue2Sync;
function isRescue(inp) {
    return (isRescue1ASync(inp) || isRescue1Sync(inp) || isRescue2ASync(inp) || isRescue3Callback(inp) || isRescue2Sync(inp));
}
exports.isRescue = isRescue;
//# sourceMappingURL=Rescue.js.map