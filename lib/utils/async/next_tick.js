"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextTick = void 0;
exports.nextTick = typeof process === 'object' && process !== null && process.nextTick || function nextTick(cb, ...args) {
    setTimeout(cb, 0, ...args);
};
//# sourceMappingURL=next_tick.js.map