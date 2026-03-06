/**
 * TypeDetectors: ES5-compatible type detection system
 * Replaces all instanceof usage in pipeline.js for ES5 compatibility
 *
 * @author Pipeline.js Team
 * @version 2.13.0
 * @license MIT
 */

/**
 * Type detection result interface
 */
export interface TypeDetectionResult {
  type: string;
  isValid: boolean;
  subtype?: string;
  confidence?: number;
}

/**
 * CleanError interface for type detection
 */
export interface CleanError extends Error {
  isClean: boolean;
  chain: any;
}

/**
 * ES5-compatible type detection utilities
 * Performance-optimized with early exit strategies
 */
export class TypeDetectors {

  // ===== ERROR TYPE DETECTION =====

  /**
   * ES5-safe Error type detection
   * Replaces: err instanceof Error
   */
  static isError(value: any): value is Error {
    return !!(
      value &&
      typeof value === 'object' &&
      typeof value.message === 'string' &&
      typeof value.name === 'string'
    );
  }

  /**
   * ES5-safe CleanError type detection
   * Replaces: err instanceof CleanError
   */
  static isCleanError(value: any): value is CleanError {
    return !!(
      value &&
      TypeDetectors.isError(value) &&
      (value as any).isClean === true &&
      typeof (value as any).chain === 'object'
    );
  }

  // ===== PROMISE TYPE DETECTION =====

  /**
   * ES5-safe Promise type detection
   * Replaces: res instanceof Promise
   */
  static isPromise(value: any): value is Promise<any> {
    return !!(
      value &&
      typeof value === 'object' &&
      typeof value.then === 'function' &&
      typeof value.catch === 'function'
    );
  }

  /**
   * Enhanced Promise detection with thenable support
   */
  static isThenable(value: any): value is { then: Function } {
    return !!(
      value &&
      typeof value.then === 'function'
    );
  }

  // ===== FUNCTION TYPE DETECTION =====

  /**
   * ES5-safe Function type detection
   * Replaces: func instanceof Function
   */
  static isFunction(value: any): value is Function {
    return typeof value === 'function';
  }

  /**
   * Async function detection for modern environments
   */
  static isAsyncFunction(value: any): value is (...args: any[]) => Promise<any> {
    return TypeDetectors.isFunction(value) &&
           value.constructor &&
           value.constructor.name === 'AsyncFunction';
  }

  // ===== OBJECT TYPE DETECTION =====

  /**
   * ES5-safe Object type detection
   * Replaces: obj instanceof Object
   */
  static isObject(value: any): value is object {
    return !!(
      value &&
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    );
  }

  /**
   * Plain object detection (excludes class instances)
   */
  static isPlainObject(value: any): value is Record<string, any> {
    if (!TypeDetectors.isObject(value)) {
      return false;
    }

    // ES5-safe check for plain objects
    try {
      return Object.prototype.toString.call(value) === '[object Object]';
    } catch (e) {
      return false;
    }
  }

  // ===== STAGE TYPE DETECTION =====

  /**
   * ES5-safe Stage type detection
   * Replaces: stage instanceof Stage
   */
  static isStage(value: any): boolean {
    return !!(
      value &&
      typeof value === 'object' &&
      typeof value.run === 'function' &&
      typeof value.execute === 'function' &&
      value._isStage === true  // Internal marker
    );
  }

  // ===== PERFORMANCE OPTIMIZED BATCH DETECTION =====

  /**
   * Single-pass type detection for performance optimization
   * Useful when multiple type checks are needed
   */
  static detectType(value: any): TypeDetectionResult {
    // Null and undefined checks (fastest)
    if (value === null) return { type: 'null', isValid: true };
    if (value === undefined) return { type: 'undefined', isValid: true };

    const valueType = typeof value;

    // Function detection
    if (valueType === 'function') {
      return {
        type: 'function',
        isValid: true,
        subtype: TypeDetectors.isAsyncFunction(value) ? 'async' : 'sync',
        confidence: 100
      };
    }

    // Object detection with subtypes
    if (valueType === 'object') {
      // Array check (fastest object subtype)
      if (Array.isArray(value)) {
        return { type: 'array', isValid: true, confidence: 100 };
      }

      // Promise check
      if (TypeDetectors.isPromise(value)) {
        return { type: 'promise', isValid: true, confidence: 95 };
      }

      // Error checks
      if (TypeDetectors.isCleanError(value)) {
        return { type: 'cleanError', isValid: true, confidence: 100 };
      }

      if (TypeDetectors.isError(value)) {
        return { type: 'error', isValid: true, confidence: 95 };
      }

      // Stage check
      if (TypeDetectors.isStage(value)) {
        return { type: 'stage', isValid: true, confidence: 100 };
      }

      // Plain object check
      if (TypeDetectors.isPlainObject(value)) {
        return { type: 'plainObject', isValid: true, confidence: 90 };
      }

      // Generic object
      return { type: 'object', isValid: true, confidence: 80 };
    }

    // Primitive types
    return {
      type: valueType,
      isValid: true,
      confidence: 100
    };
  }

  // ===== UTILITY METHODS =====

  /**
   * ES5-safe array detection
   */
  static isArray(value: any): value is any[] {
    return Array.isArray ? Array.isArray(value) :
           Object.prototype.toString.call(value) === '[object Array]';
  }

  /**
   * Type validation with custom error messages
   */
  static validateType(
    value: any,
    expectedType: string,
    paramName?: string
  ): void {
    const detection = TypeDetectors.detectType(value);

    if (detection.type !== expectedType) {
      const name = paramName ? ` '${paramName}'` : '';
      throw new TypeError(
        `Expected${name} to be ${expectedType}, got ${detection.type}`
      );
    }
  }

  /**
   * Safe property access checker
   */
  static hasProperty(obj: any, prop: string): boolean {
    return TypeDetectors.isObject(obj) &&
           Object.prototype.hasOwnProperty.call(obj, prop);
  }

  /**
   * ES5-safe method existence checker
   */
  static hasMethod(obj: any, methodName: string): boolean {
    return TypeDetectors.hasProperty(obj, methodName) &&
           TypeDetectors.isFunction(obj[methodName]);
  }

  // ===== DATE / TYPEERROR / BUFFER DETECTION =====

  /**
   * ES5-safe Date type detection
   * Replaces: value instanceof Date
   */
  static isDate(value: any): value is Date {
    return Object.prototype.toString.call(value) === '[object Date]';
  }

  /**
   * ES5-safe TypeError detection
   * Replaces: error instanceof TypeError
   */
  static isTypeError(value: any): value is TypeError {
    return TypeDetectors.isError(value) && value.name === 'TypeError';
  }

  /**
   * ES5-safe Buffer detection (Node.js / Bun)
   * Replaces: Buffer.isBuffer(value)
   * Falls back gracefully in non-Node environments.
   */
  static isBuffer(value: any): value is Buffer {
    if (typeof Buffer !== 'undefined' && typeof Buffer.isBuffer === 'function') {
      return Buffer.isBuffer(value);
    }
    return !!(value && value.constructor && value.constructor.name === 'Buffer');
  }
}

// ===== DEFAULT EXPORT =====
export default TypeDetectors;

// ===== NAMED EXPORTS FOR CONVENIENCE =====
export const {
  isError,
  isCleanError,
  isPromise,
  isThenable,
  isFunction,
  isAsyncFunction,
  isObject,
  isPlainObject,
  isStage,
  isArray,
  detectType,
  validateType,
  hasProperty,
  hasMethod,
  isDate,
  isTypeError,
  isBuffer,
} = TypeDetectors;