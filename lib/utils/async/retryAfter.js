"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryAfter = retryAfter;
function retryAfter(promiseFactory_1, timeout_1) {
    return __awaiter(this, arguments, void 0, function* (promiseFactory, timeout, maxAttempts = Infinity) {
        let attempts = 0;
        while (true) {
            let timeoutId = null;
            try {
                return yield Promise.try(promiseFactory);
            }
            catch (err) {
                attempts++;
                if (attempts >= maxAttempts) {
                    throw new Error(`Max attempts (${maxAttempts}) reached: ${err}`);
                }
                const { promise, resolve } = Promise.withResolvers();
                timeoutId = setTimeout(resolve, timeout);
                yield promise;
            }
            finally {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
            }
        }
    });
}
//# sourceMappingURL=retryAfter.js.map