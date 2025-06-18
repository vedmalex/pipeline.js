"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasMethod = exports.hasProperty = exports.validateType = exports.detectType = exports.isArray = exports.isStage = exports.isPlainObject = exports.isObject = exports.isAsyncFunction = exports.isFunction = exports.isThenable = exports.isPromise = exports.isCleanError = exports.isError = exports.TypeDetectors = void 0;
var TypeDetectors = (function () {
    function TypeDetectors() {
    }
    TypeDetectors.isError = function (value) {
        return !!(value &&
            typeof value === 'object' &&
            typeof value.message === 'string' &&
            typeof value.name === 'string');
    };
    TypeDetectors.isCleanError = function (value) {
        return !!(value &&
            TypeDetectors.isError(value) &&
            value.isClean === true &&
            typeof value.chain === 'object');
    };
    TypeDetectors.isPromise = function (value) {
        return !!(value &&
            typeof value === 'object' &&
            typeof value.then === 'function' &&
            typeof value.catch === 'function');
    };
    TypeDetectors.isThenable = function (value) {
        return !!(value &&
            typeof value.then === 'function');
    };
    TypeDetectors.isFunction = function (value) {
        return typeof value === 'function';
    };
    TypeDetectors.isAsyncFunction = function (value) {
        return TypeDetectors.isFunction(value) &&
            value.constructor &&
            value.constructor.name === 'AsyncFunction';
    };
    TypeDetectors.isObject = function (value) {
        return !!(value &&
            typeof value === 'object' &&
            value !== null &&
            !Array.isArray(value));
    };
    TypeDetectors.isPlainObject = function (value) {
        if (!TypeDetectors.isObject(value)) {
            return false;
        }
        try {
            return Object.prototype.toString.call(value) === '[object Object]';
        }
        catch (e) {
            return false;
        }
    };
    TypeDetectors.isStage = function (value) {
        return !!(value &&
            typeof value === 'object' &&
            typeof value.run === 'function' &&
            typeof value.execute === 'function' &&
            value._isStage === true);
    };
    TypeDetectors.detectType = function (value) {
        if (value === null)
            return { type: 'null', isValid: true };
        if (value === undefined)
            return { type: 'undefined', isValid: true };
        var valueType = typeof value;
        if (valueType === 'function') {
            return {
                type: 'function',
                isValid: true,
                subtype: TypeDetectors.isAsyncFunction(value) ? 'async' : 'sync',
                confidence: 100
            };
        }
        if (valueType === 'object') {
            if (Array.isArray(value)) {
                return { type: 'array', isValid: true, confidence: 100 };
            }
            if (TypeDetectors.isPromise(value)) {
                return { type: 'promise', isValid: true, confidence: 95 };
            }
            if (TypeDetectors.isCleanError(value)) {
                return { type: 'cleanError', isValid: true, confidence: 100 };
            }
            if (TypeDetectors.isError(value)) {
                return { type: 'error', isValid: true, confidence: 95 };
            }
            if (TypeDetectors.isStage(value)) {
                return { type: 'stage', isValid: true, confidence: 100 };
            }
            if (TypeDetectors.isPlainObject(value)) {
                return { type: 'plainObject', isValid: true, confidence: 90 };
            }
            return { type: 'object', isValid: true, confidence: 80 };
        }
        return {
            type: valueType,
            isValid: true,
            confidence: 100
        };
    };
    TypeDetectors.isArray = function (value) {
        return Array.isArray ? Array.isArray(value) :
            Object.prototype.toString.call(value) === '[object Array]';
    };
    TypeDetectors.validateType = function (value, expectedType, paramName) {
        var detection = TypeDetectors.detectType(value);
        if (detection.type !== expectedType) {
            var name = paramName ? " '".concat(paramName, "'") : '';
            throw new TypeError("Expected".concat(name, " to be ").concat(expectedType, ", got ").concat(detection.type));
        }
    };
    TypeDetectors.hasProperty = function (obj, prop) {
        return TypeDetectors.isObject(obj) &&
            Object.prototype.hasOwnProperty.call(obj, prop);
    };
    TypeDetectors.hasMethod = function (obj, methodName) {
        return TypeDetectors.hasProperty(obj, methodName) &&
            TypeDetectors.isFunction(obj[methodName]);
    };
    return TypeDetectors;
}());
exports.TypeDetectors = TypeDetectors;
exports.default = TypeDetectors;
exports.isError = TypeDetectors.isError, exports.isCleanError = TypeDetectors.isCleanError, exports.isPromise = TypeDetectors.isPromise, exports.isThenable = TypeDetectors.isThenable, exports.isFunction = TypeDetectors.isFunction, exports.isAsyncFunction = TypeDetectors.isAsyncFunction, exports.isObject = TypeDetectors.isObject, exports.isPlainObject = TypeDetectors.isPlainObject, exports.isStage = TypeDetectors.isStage, exports.isArray = TypeDetectors.isArray, exports.detectType = TypeDetectors.detectType, exports.validateType = TypeDetectors.validateType, exports.hasProperty = TypeDetectors.hasProperty, exports.hasMethod = TypeDetectors.hasMethod;
//# sourceMappingURL=TypeDetectors.js.map