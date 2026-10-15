"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.warnOnce = warnOnce;
exports.__resetWarnOnceForTests = __resetWarnOnceForTests;
const warnedKeys = new Set();
function warnOnce(key, message) {
    if (warnedKeys.has(key)) {
        return;
    }
    warnedKeys.add(key);
    console.warn(message);
}
function __resetWarnOnceForTests() {
    warnedKeys.clear();
}
//# sourceMappingURL=warn_once.js.map