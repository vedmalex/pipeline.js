"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTimeout = withTimeout;
function withTimeout(promise, timeout) {
    var _a = Promise.withResolvers(), timeoutPromise = _a.promise, reject = _a.reject;
    if (timeout !== Infinity) {
        var timeoutId_1 = setTimeout(function () {
            reject(new Error("Operation timed out after ".concat(timeout, "ms")));
        }, timeout);
        return Promise.race([
            promise.finally(function () { return clearTimeout(timeoutId_1); }),
            timeoutPromise,
        ]);
    }
    else {
        return promise;
    }
}
//# sourceMappingURL=withTimeout.js.map