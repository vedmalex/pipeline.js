"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComplexError = exports.CleanError = void 0;
exports.createError = createError;
exports.createErrorWithContext = createErrorWithContext;
exports.chainErrors = chainErrors;
exports.isCleanError = isCleanError;
exports.isErrorChain = isErrorChain;
exports.extractPrimaryError = extractPrimaryError;
exports.getErrorContext = getErrorContext;
exports.CreateError = CreateError;
exports.isComplexError = isComplexError;
exports.benchmarkErrorCreation = benchmarkErrorCreation;
var CleanError = (function (_super) {
    __extends(CleanError, _super);
    function CleanError(primary, options) {
        var _this = _super.call(this, typeof primary === 'string' ? primary : primary.message) || this;
        _this.isClean = true;
        _this.name = 'CleanError';
        _this.chain = {
            primary: typeof primary === 'string' ? new Error(primary) : primary,
            secondary: options === null || options === void 0 ? void 0 : options.secondary,
            context: options === null || options === void 0 ? void 0 : options.context,
            trace: (function () {
                try {
                    var stack = new Error().stack;
                    if (!stack)
                        return [];
                    return stack
                        .split('\n')
                        .slice(2, 5)
                        .map(function (frame) { return frame.trim(); })
                        .filter(function (frame) { return frame.length > 0; });
                }
                catch (e) {
                    return [];
                }
            })()
        };
        if (options === null || options === void 0 ? void 0 : options.cause) {
            _this.cause = options.cause;
        }
        Object.setPrototypeOf(_this, CleanError.prototype);
        return _this;
    }
    CleanError.prototype.getPrimaryError = function () {
        return this.chain.primary;
    };
    CleanError.prototype.getSecondaryErrors = function () {
        return this.chain.secondary || [];
    };
    CleanError.prototype.getContext = function () {
        return this.chain.context;
    };
    Object.defineProperty(CleanError.prototype, "cause", {
        get: function () {
            return {
                err: this.chain.primary
            };
        },
        set: function (value) {
            Object.defineProperty(this, '_legacyCause', {
                value: value,
                writable: true,
                enumerable: false
            });
        },
        enumerable: false,
        configurable: true
    });
    CleanError.prototype.toString = function () {
        var primary = this.chain.primary.message;
        var secondary = this.chain.secondary;
        if (secondary && secondary.length > 0) {
            return "".concat(primary, " (").concat(secondary.length, " related errors)");
        }
        return primary;
    };
    CleanError.prototype.toJSON = function () {
        var _a;
        return {
            name: this.name,
            message: this.message,
            primary: this.chain.primary.message,
            secondaryCount: ((_a = this.chain.secondary) === null || _a === void 0 ? void 0 : _a.length) || 0,
            context: this.chain.context,
            timestamp: new Date().toISOString()
        };
    };
    return CleanError;
}(Error));
exports.CleanError = CleanError;
exports.ComplexError = CleanError;
function createError(input) {
    if (typeof input === 'string') {
        return new CleanError(input);
    }
    if (Array.isArray(input)) {
        var validErrors = input.filter(function (err) { return err instanceof Error; });
        if (validErrors.length === 0) {
            return new CleanError('Unknown error occurred');
        }
        if (validErrors.length === 1) {
            return new CleanError(validErrors[0]);
        }
        var primary = validErrors[0], secondary = validErrors.slice(1);
        return new CleanError(primary, { secondary: secondary });
    }
    return new CleanError(input);
}
function createErrorWithContext(error, context) {
    return new CleanError(error, { context: context });
}
function chainErrors(primary, secondary) {
    return new CleanError(primary, { secondary: secondary });
}
function isCleanError(input) {
    return input instanceof CleanError && input.isClean === true;
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
function benchmarkErrorCreation(iterations) {
    if (iterations === void 0) { iterations = 1000; }
    var errors = Array.from({ length: 10 }, function (_, i) { return new Error("Test error ".concat(i)); });
    var cleanStart = performance.now();
    for (var i = 0; i < iterations; i++) {
        createError(errors);
    }
    var cleanEnd = performance.now();
    var cleanErrorTime = cleanEnd - cleanStart;
    var complexStart = performance.now();
    for (var i = 0; i < iterations; i++) {
        var payload = __spreadArray([], errors, true);
        var complex = { payload: payload, isComplex: true };
        JSON.stringify(complex);
    }
    var complexEnd = performance.now();
    var complexErrorTime = complexEnd - complexStart;
    var improvement = ((complexErrorTime - cleanErrorTime) / complexErrorTime * 100).toFixed(1);
    return {
        cleanErrorTime: cleanErrorTime,
        complexErrorTime: complexErrorTime,
        improvement: "".concat(improvement, "% faster")
    };
}
//# sourceMappingURL=ErrorList.js.map