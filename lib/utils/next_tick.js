"use strict";
var nextTick = typeof process === 'object' && process !== null && process.nextTick || function nextTick(cb) {
    setTimeout(cb, 0);
};
//# sourceMappingURL=next_tick.js.map