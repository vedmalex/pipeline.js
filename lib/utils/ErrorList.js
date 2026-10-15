"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplexError = exports.CleanError = exports.ErrorMessage = exports.ErrorCode = void 0;
exports.createError = createError;
exports.createErrorWithContext = createErrorWithContext;
exports.createCodeError = createCodeError;
exports.normalizeExecutionErrorInput = normalizeExecutionErrorInput;
exports.chainErrors = chainErrors;
exports.isCleanError = isCleanError;
exports.isErrorChain = isErrorChain;
exports.extractPrimaryError = extractPrimaryError;
exports.getErrorContext = getErrorContext;
exports.CreateError = CreateError;
exports.isComplexError = isComplexError;
exports.benchmarkErrorCreation = benchmarkErrorCreation;
const TypeDetectors_1 = require("./TypeDetectors");
const errors_1 = require("./errors");
var errors_2 = require("./errors");
Object.defineProperty(exports, "ErrorCode", { enumerable: true, get: function () { return errors_2.ErrorCode; } });
Object.defineProperty(exports, "ErrorMessage", { enumerable: true, get: function () { return errors_2.ErrorMessage; } });
class CleanError extends Error {
    constructor(primary, options) {
        var _a, _b;
        super(typeof primary === 'string' ? primary : primary.message);
        this.isClean = true;
        this.name = 'CleanError';
        this.code = (_a = options === null || options === void 0 ? void 0 : options.code) !== null && _a !== void 0 ? _a : errors_1.ErrorCode.ERR_STAGE_THROW;
        const chainBase = {
            primary: typeof primary === 'string' ? new Error(primary) : primary,
            secondary: options === null || options === void 0 ? void 0 : options.secondary,
            context: options === null || options === void 0 ? void 0 : options.context,
        };
        const rawStack = (_b = new Error().stack) !== null && _b !== void 0 ? _b : '';
        let _traceCache;
        Object.defineProperty(chainBase, 'trace', {
            get() {
                if (_traceCache === undefined) {
                    _traceCache = rawStack.split('\n').slice(2, 5)
                        .map(f => f.trim()).filter(f => f.length > 0);
                }
                return _traceCache;
            },
            enumerable: true,
            configurable: true,
        });
        this.chain = chainBase;
        if (options === null || options === void 0 ? void 0 : options.cause) {
            this.cause = options.cause;
        }
        Object.setPrototypeOf(this, CleanError.prototype);
    }
    getPrimaryError() {
        return this.chain.primary;
    }
    getSecondaryErrors() {
        return this.chain.secondary || [];
    }
    getContext() {
        return this.chain.context;
    }
    get cause() {
        return {
            err: this.chain.primary
        };
    }
    set cause(value) {
        Object.defineProperty(this, '_legacyCause', {
            value,
            writable: true,
            enumerable: false
        });
    }
    toString() {
        const primary = this.chain.primary.message;
        const secondary = this.chain.secondary;
        if (secondary && secondary.length > 0) {
            return `${primary} (${secondary.length} related errors)`;
        }
        return primary;
    }
    toJSON() {
        var _a;
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            primary: this.chain.primary.message,
            secondaryCount: ((_a = this.chain.secondary) === null || _a === void 0 ? void 0 : _a.length) || 0,
            context: this.chain.context,
            timestamp: new Date().toISOString()
        };
    }
}
exports.CleanError = CleanError;
exports.ComplexError = CleanError;
function cloneCleanError(error, overrides) {
    var _a, _b, _c;
    const cloned = new CleanError(error.getPrimaryError(), {
        secondary: (_a = overrides === null || overrides === void 0 ? void 0 : overrides.secondary) !== null && _a !== void 0 ? _a : error.getSecondaryErrors(),
        context: (_b = overrides === null || overrides === void 0 ? void 0 : overrides.context) !== null && _b !== void 0 ? _b : error.getContext(),
        code: (_c = overrides === null || overrides === void 0 ? void 0 : overrides.code) !== null && _c !== void 0 ? _c : error.code,
    });
    Object.defineProperty(cloned.chain, 'trace', {
        get() {
            var _a;
            return (_a = error.chain.trace) !== null && _a !== void 0 ? _a : [];
        },
        enumerable: true,
        configurable: true,
    });
    return cloned;
}
function createError(input, code) {
    if ((0, TypeDetectors_1.isCleanError)(input)) {
        const clean = input;
        return !code || clean.code === code ? clean : cloneCleanError(clean, { code });
    }
    if (typeof input === 'string') {
        return new CleanError(input, { code: code !== null && code !== void 0 ? code : errors_1.ErrorCode.ERR_UNKNOWN });
    }
    if (Array.isArray(input)) {
        const validErrors = input.filter((err) => (0, TypeDetectors_1.isError)(err));
        if (validErrors.length === 0) {
            return new CleanError(errors_1.ErrorMessage[errors_1.ErrorCode.ERR_UNKNOWN], { code: code !== null && code !== void 0 ? code : errors_1.ErrorCode.ERR_UNKNOWN });
        }
        if (validErrors.length === 1) {
            if ((0, TypeDetectors_1.isCleanError)(validErrors[0])) {
                const clean = validErrors[0];
                return !code || clean.code === code ? clean : cloneCleanError(clean, { code });
            }
            return new CleanError(validErrors[0], { code });
        }
        const [primary, ...secondary] = validErrors;
        if ((0, TypeDetectors_1.isCleanError)(primary)) {
            const clean = primary;
            return cloneCleanError(clean, {
                secondary: [...clean.getSecondaryErrors(), ...secondary],
                code: code !== null && code !== void 0 ? code : clean.code,
            });
        }
        return new CleanError(primary, { secondary, code });
    }
    return new CleanError(input, { code });
}
function createErrorWithContext(error, context, code) {
    return new CleanError(error, { context, code });
}
function createCodeError(code, detail) {
    const msg = detail
        ? `${errors_1.ErrorMessage[code]}: ${detail}`
        : errors_1.ErrorMessage[code];
    return new CleanError(msg, { code });
}
function normalizeExecutionErrorInput(input) {
    if (input === undefined || input === null) {
        return input;
    }
    if ((0, TypeDetectors_1.isCleanError)(input)) {
        return input;
    }
    if ((0, TypeDetectors_1.isError)(input)) {
        return createError(input);
    }
    if (typeof input === 'string') {
        return createError(input);
    }
    return createError(String(input));
}
function chainErrors(primary, secondary, code) {
    return new CleanError(primary, { secondary, code });
}
function isCleanError(input) {
    return (0, TypeDetectors_1.isCleanError)(input);
}
function isErrorChain(input) {
    return isCleanError(input) && Array.isArray(input.chain.secondary);
}
function extractPrimaryError(error) {
    return error.getPrimaryError();
}
function getErrorContext(error) {
    return error.getContext();
}
function CreateError(err) {
    if (process.env.NODE_ENV !== 'production') {
        console.warn('[DEPRECATED] CreateError is deprecated. Use createError instead.');
    }
    if (!err) {
        return undefined;
    }
    return createError(err);
}
function isComplexError(inp) {
    if (process.env.NODE_ENV !== 'production') {
        console.warn('[DEPRECATED] isComplexError is deprecated. Use isCleanError instead.');
    }
    return isCleanError(inp);
}
function benchmarkErrorCreation(iterations = 1000) {
    const errors = Array.from({ length: 10 }, (_, i) => new Error(`Test error ${i}`));
    const cleanStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        createError(errors);
    }
    const cleanEnd = performance.now();
    const cleanErrorTime = cleanEnd - cleanStart;
    const complexStart = performance.now();
    for (let i = 0; i < iterations; i++) {
        const payload = [...errors];
        const complex = { payload, isComplex: true };
        JSON.stringify(complex);
    }
    const complexEnd = performance.now();
    const complexErrorTime = complexEnd - complexStart;
    const improvement = ((complexErrorTime - cleanErrorTime) / complexErrorTime * 100).toFixed(1);
    return {
        cleanErrorTime,
        complexErrorTime,
        improvement: `${improvement}% faster`
    };
}
//# sourceMappingURL=ErrorList.js.map