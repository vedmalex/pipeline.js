"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bindExecutionSignal = bindExecutionSignal;
exports.getExecutionSignal = getExecutionSignal;
exports.getExecutionAbortError = getExecutionAbortError;
exports.getPublicExecutionAbortError = getPublicExecutionAbortError;
exports.createLinkedAbortController = createLinkedAbortController;
exports.isExecutionAborted = isExecutionAborted;
exports.throwIfExecutionAborted = throwIfExecutionAborted;
const ErrorList_1 = require("./utils/ErrorList");
const errors_1 = require("./utils/errors");
const ExecutionSignalSymbol = Symbol.for('pipeline.js.execution-signal');
function getSignalCarrier(ctx) {
    if (!ctx || (typeof ctx !== 'object' && typeof ctx !== 'function')) {
        return undefined;
    }
    const original = ctx.original;
    if (original && typeof original === 'object') {
        return original;
    }
    return ctx;
}
function bindExecutionSignal(ctx, signal) {
    const carrier = getSignalCarrier(ctx);
    if (!carrier || !signal) {
        return () => { };
    }
    const previous = Object.getOwnPropertyDescriptor(carrier, ExecutionSignalSymbol);
    Object.defineProperty(carrier, ExecutionSignalSymbol, {
        value: signal,
        configurable: true,
        enumerable: false,
        writable: true,
    });
    return () => {
        if (previous) {
            Object.defineProperty(carrier, ExecutionSignalSymbol, previous);
        }
        else {
            delete carrier[ExecutionSignalSymbol];
        }
    };
}
function getExecutionSignal(ctx) {
    var _a;
    return (_a = getSignalCarrier(ctx)) === null || _a === void 0 ? void 0 : _a[ExecutionSignalSymbol];
}
function getExecutionAbortError(reason) {
    if (reason instanceof Error
        && (reason.code === errors_1.ErrorCode.ERR_STAGE_ABORTED
            || reason.code === errors_1.ErrorCode.ERR_STAGE_TIMEOUT)) {
        return reason;
    }
    return (0, ErrorList_1.createCodeError)(errors_1.ErrorCode.ERR_STAGE_ABORTED);
}
function getPublicExecutionAbortError(reason) {
    if (reason instanceof Error
        && reason.code === errors_1.ErrorCode.ERR_STAGE_ABORTED) {
        return reason;
    }
    return (0, ErrorList_1.createCodeError)(errors_1.ErrorCode.ERR_STAGE_ABORTED);
}
function createLinkedAbortController(signal) {
    const controller = new AbortController();
    if (!signal) {
        return {
            controller,
            cleanup: () => { },
        };
    }
    if (signal.aborted) {
        controller.abort(getExecutionAbortError(signal.reason));
        return {
            controller,
            cleanup: () => { },
        };
    }
    const onAbort = () => {
        controller.abort(getExecutionAbortError(signal.reason));
    };
    signal.addEventListener('abort', onAbort, { once: true });
    const cleanup = () => {
        signal.removeEventListener('abort', onAbort);
    };
    controller.signal.addEventListener('abort', cleanup, { once: true });
    return {
        controller,
        cleanup,
    };
}
function isExecutionAborted(ctx) {
    var _a;
    var _b;
    return (_b = (_a = getExecutionSignal(ctx)) === null || _a === void 0 ? void 0 : _a.aborted) !== null && _b !== void 0 ? _b : false;
}
function throwIfExecutionAborted(ctx) {
    const signal = getExecutionSignal(ctx);
    if (!(signal === null || signal === void 0 ? void 0 : signal.aborted)) {
        return;
    }
    throw getExecutionAbortError(signal.reason);
}
//# sourceMappingURL=execution_signal.js.map