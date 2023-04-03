"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Rescue = exports.isRescue = exports.isRescue2Sync = exports.isRescue3Callback = exports.isRescue2ASync = exports.isRescue1ASync = exports.isRescue1Sync = exports.Rescue3Callback = exports.Rescue2Sync = exports.Rescue2ASync = exports.Rescue1ASync = exports.Rescue1Sync = void 0;
const tslib_1 = require("tslib");
const z = tslib_1.__importStar(require("zod"));
exports.Rescue1Sync = z.function().args(z.unknown()).returns(z.any());
exports.Rescue1ASync = z.function().args(z.unknown()).returns(z.promise(z.void()));
exports.Rescue2ASync = z.function().args(z.unknown(), z.unknown()).returns(z.promise(z.void()));
exports.Rescue2Sync = z.function().args(z.unknown(), z.unknown()).returns(z.unknown());
exports.Rescue3Callback = z.function().args(z.unknown(), z.unknown(), z.function()).returns(z.void());
function isRescue1Sync(inp) {
    return typeof inp == 'function' && inp.length == 1;
}
exports.isRescue1Sync = isRescue1Sync;
function isRescue1ASync(inp) {
    return exports.Rescue1ASync.safeParse(inp).success;
}
exports.isRescue1ASync = isRescue1ASync;
function isRescue2ASync(inp) {
    return exports.Rescue2ASync.safeParse(inp).success;
}
exports.isRescue2ASync = isRescue2ASync;
function isRescue3Callback(inp) {
    return exports.Rescue3Callback.safeParse(inp).success;
}
exports.isRescue3Callback = isRescue3Callback;
function isRescue2Sync(inp) {
    return exports.Rescue2ASync.safeParse(inp).success;
}
exports.isRescue2Sync = isRescue2Sync;
function isRescue(inp) {
    return (isRescue1ASync(inp) || isRescue1Sync(inp) || isRescue2ASync(inp) || isRescue3Callback(inp) || isRescue2Sync(inp));
}
exports.isRescue = isRescue;
exports.Rescue = z.union([exports.Rescue1Sync, exports.Rescue1ASync, exports.Rescue2ASync, exports.Rescue2Sync, exports.Rescue3Callback]);
//# sourceMappingURL=Rescue.js.map