"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBuffer = exports.isTypeError = exports.isDate = exports.hasMethod = exports.hasProperty = exports.validateType = exports.detectType = exports.isArray = exports.isStage = exports.isPlainObject = exports.isObject = exports.isAsyncFunction = exports.isFunction = exports.isThenable = exports.isPromise = exports.isCleanError = exports.isError = exports.TypeDetectors = void 0;
class TypeDetectors {
    static isError(value) {
        return !!(value &&
            typeof value === 'object' &&
            typeof value.message === 'string' &&
            typeof value.name === 'string');
    }
    static isCleanError(value) {
        return !!(value &&
            TypeDetectors.isError(value) &&
            value.isClean === true &&
            typeof value.chain === 'object');
    }
    static isPromise(value) {
        return !!(value &&
            typeof value === 'object' &&
            typeof value.then === 'function' &&
            typeof value.catch === 'function');
    }
    static isThenable(value) {
        return !!(value &&
            typeof value.then === 'function');
    }
    static isFunction(value) {
        return typeof value === 'function';
    }
    static isAsyncFunction(value) {
        return TypeDetectors.isFunction(value) &&
            value.constructor &&
            value.constructor.name === 'AsyncFunction';
    }
    static isObject(value) {
        return !!(value &&
            typeof value === 'object' &&
            value !== null &&
            !Array.isArray(value));
    }
    static isPlainObject(value) {
        if (!TypeDetectors.isObject(value)) {
            return false;
        }
        try {
            return Object.prototype.toString.call(value) === '[object Object]';
        }
        catch (e) {
            return false;
        }
    }
    static isStage(value) {
        return !!(value &&
            typeof value === 'object' &&
            typeof value.run === 'function' &&
            typeof value.execute === 'function' &&
            value._isStage === true);
    }
    static detectType(value) {
        if (value === null)
            return { type: 'null', isValid: true };
        if (value === undefined)
            return { type: 'undefined', isValid: true };
        const valueType = typeof value;
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
    }
    static isArray(value) {
        return Array.isArray ? Array.isArray(value) :
            Object.prototype.toString.call(value) === '[object Array]';
    }
    static validateType(value, expectedType, paramName) {
        const detection = TypeDetectors.detectType(value);
        if (detection.type !== expectedType) {
            const name = paramName ? ` '${paramName}'` : '';
            throw new TypeError(`Expected${name} to be ${expectedType}, got ${detection.type}`);
        }
    }
    static hasProperty(obj, prop) {
        return TypeDetectors.isObject(obj) &&
            Object.prototype.hasOwnProperty.call(obj, prop);
    }
    static hasMethod(obj, methodName) {
        return TypeDetectors.hasProperty(obj, methodName) &&
            TypeDetectors.isFunction(obj[methodName]);
    }
    static isDate(value) {
        return Object.prototype.toString.call(value) === '[object Date]';
    }
    static isTypeError(value) {
        return TypeDetectors.isError(value) && value.name === 'TypeError';
    }
    static isBuffer(value) {
        if (typeof Buffer !== 'undefined' && typeof Buffer.isBuffer === 'function') {
            return Buffer.isBuffer(value);
        }
        return !!(value && value.constructor && value.constructor.name === 'Buffer');
    }
}
exports.TypeDetectors = TypeDetectors;
exports.default = TypeDetectors;
({ isError: exports.isError, isCleanError: exports.isCleanError, isPromise: exports.isPromise, isThenable: exports.isThenable, isFunction: exports.isFunction, isAsyncFunction: exports.isAsyncFunction, isObject: exports.isObject, isPlainObject: exports.isPlainObject, isStage: exports.isStage, isArray: exports.isArray, detectType: exports.detectType, validateType: exports.validateType, hasProperty: exports.hasProperty, hasMethod: exports.hasMethod, isDate: exports.isDate, isTypeError: exports.isTypeError, isBuffer: exports.isBuffer } = TypeDetectors);
//# sourceMappingURL=TypeDetectors.js.map