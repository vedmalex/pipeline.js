"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTimeout = withTimeout;
function withTimeout(promise, timeout) {
    const { promise: timeoutPromise, reject } = Promise.withResolvers();
    if (timeout !== Infinity) {
        const timeoutId = setTimeout(() => {
            reject(new Error(`Operation timed out after ${timeout}ms`));
        }, timeout);
        return Promise.race([
            promise.finally(() => clearTimeout(timeoutId)),
            timeoutPromise,
        ]);
    }
    else {
        return promise;
    }
}
//# sourceMappingURL=withTimeout.js.map