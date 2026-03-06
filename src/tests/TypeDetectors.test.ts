import { describe, it, expect } from 'bun:test';
import TypeDetectors, {
  isError,
  isCleanError,
  isPromise,
  isFunction,
  isObject,
  isStage,
  detectType,
  type CleanError
} from '../utils/TypeDetectors';

describe('TypeDetectors', () => {

  // ===== ERROR TYPE DETECTION TESTS =====

  describe('isError', () => {
    it('should detect Error instances', () => {
      const error = new Error('test error');
      expect(TypeDetectors.isError(error)).toBe(true);
      expect(isError(error)).toBe(true);
    });

    it('should detect TypeError instances', () => {
      const error = new TypeError('type error');
      expect(TypeDetectors.isError(error)).toBe(true);
    });

    it('should detect RangeError instances', () => {
      const error = new RangeError('range error');
      expect(TypeDetectors.isError(error)).toBe(true);
    });

    it('should detect error-like objects', () => {
      const errorLike = {
        name: 'CustomError',
        message: 'custom error message'
      };
      expect(TypeDetectors.isError(errorLike)).toBe(true);
    });

    it('should reject non-error objects', () => {
      expect(TypeDetectors.isError({})).toBe(false);
      expect(TypeDetectors.isError({ message: 'only message' })).toBe(false);
      expect(TypeDetectors.isError({ name: 'only name' })).toBe(false);
      expect(TypeDetectors.isError(null)).toBe(false);
      expect(TypeDetectors.isError(undefined)).toBe(false);
      expect(TypeDetectors.isError('string')).toBe(false);
      expect(TypeDetectors.isError(123)).toBe(false);
    });
  });

  describe('isCleanError', () => {
    it('should detect CleanError instances', () => {
      const cleanError: CleanError = {
        name: 'CleanError',
        message: 'clean error',
        isClean: true,
        chain: { primary: new Error('primary') }
      };
      expect(TypeDetectors.isCleanError(cleanError)).toBe(true);
      expect(isCleanError(cleanError)).toBe(true);
    });

    it('should reject regular errors', () => {
      const error = new Error('regular error');
      expect(TypeDetectors.isCleanError(error)).toBe(false);
    });

    it('should reject error-like objects without isClean', () => {
      const errorLike = {
        name: 'Error',
        message: 'error message',
        chain: {}
      };
      expect(TypeDetectors.isCleanError(errorLike)).toBe(false);
    });
  });

  // ===== PROMISE TYPE DETECTION TESTS =====

  describe('isPromise', () => {
    it('should detect Promise instances', () => {
      const promise = Promise.resolve('test');
      expect(TypeDetectors.isPromise(promise)).toBe(true);
      expect(isPromise(promise)).toBe(true);
    });

    it('should detect rejected promises', () => {
      const promise = Promise.reject('error').catch(() => {});
      expect(TypeDetectors.isPromise(promise)).toBe(true);
    });

    it('should detect promise-like objects', () => {
      const promiseLike = {
        then: () => {},
        catch: () => {}
      };
      expect(TypeDetectors.isPromise(promiseLike)).toBe(true);
    });

    it('should reject non-promise objects', () => {
      expect(TypeDetectors.isPromise({})).toBe(false);
      expect(TypeDetectors.isPromise({ then: 'not function' })).toBe(false);
      expect(TypeDetectors.isPromise({ catch: () => {} })).toBe(false);
      expect(TypeDetectors.isPromise(null)).toBe(false);
      expect(TypeDetectors.isPromise(undefined)).toBe(false);
      expect(TypeDetectors.isPromise('string')).toBe(false);
    });
  });

  describe('isThenable', () => {
    it('should detect thenable objects', () => {
      const thenable = { then: () => {} };
      expect(TypeDetectors.isThenable(thenable)).toBe(true);
    });

    it('should detect promises as thenables', () => {
      const promise = Promise.resolve('test');
      expect(TypeDetectors.isThenable(promise)).toBe(true);
    });

    it('should reject non-thenable objects', () => {
      expect(TypeDetectors.isThenable({})).toBe(false);
      expect(TypeDetectors.isThenable({ then: 'not function' })).toBe(false);
    });
  });

  // ===== FUNCTION TYPE DETECTION TESTS =====

  describe('isFunction', () => {
    it('should detect regular functions', () => {
      function regularFunction() {}
      expect(TypeDetectors.isFunction(regularFunction)).toBe(true);
      expect(isFunction(regularFunction)).toBe(true);
    });

    it('should detect arrow functions', () => {
      const arrowFunction = () => {};
      expect(TypeDetectors.isFunction(arrowFunction)).toBe(true);
    });

    it('should detect async functions', () => {
      async function asyncFunction() {}
      expect(TypeDetectors.isFunction(asyncFunction)).toBe(true);
    });

    it('should detect class constructors', () => {
      class TestClass {}
      expect(TypeDetectors.isFunction(TestClass)).toBe(true);
    });

    it('should reject non-functions', () => {
      expect(TypeDetectors.isFunction({})).toBe(false);
      expect(TypeDetectors.isFunction('string')).toBe(false);
      expect(TypeDetectors.isFunction(123)).toBe(false);
      expect(TypeDetectors.isFunction(null)).toBe(false);
      expect(TypeDetectors.isFunction(undefined)).toBe(false);
    });
  });

  describe('isAsyncFunction', () => {
    it('should detect async functions', () => {
      async function asyncFunction() {}
      expect(TypeDetectors.isAsyncFunction(asyncFunction)).toBe(true);
    });

    it('should detect async arrow functions', () => {
      const asyncArrow = async () => {};
      expect(TypeDetectors.isAsyncFunction(asyncArrow)).toBe(true);
    });

    it('should reject regular functions', () => {
      function regularFunction() {}
      expect(TypeDetectors.isAsyncFunction(regularFunction)).toBe(false);
    });

    it('should reject non-functions', () => {
      expect(TypeDetectors.isAsyncFunction({})).toBe(false);
      expect(TypeDetectors.isAsyncFunction('string')).toBe(false);
    });
  });

  // ===== OBJECT TYPE DETECTION TESTS =====

  describe('isObject', () => {
    it('should detect plain objects', () => {
      expect(TypeDetectors.isObject({})).toBe(true);
      expect(TypeDetectors.isObject({ key: 'value' })).toBe(true);
      expect(isObject({ key: 'value' })).toBe(true);
    });

    it('should detect class instances', () => {
      class TestClass {}
      const instance = new TestClass();
      expect(TypeDetectors.isObject(instance)).toBe(true);
    });

    it('should reject arrays', () => {
      expect(TypeDetectors.isObject([])).toBe(false);
      expect(TypeDetectors.isObject([1, 2, 3])).toBe(false);
    });

    it('should reject null', () => {
      expect(TypeDetectors.isObject(null)).toBe(false);
    });

    it('should reject primitives', () => {
      expect(TypeDetectors.isObject('string')).toBe(false);
      expect(TypeDetectors.isObject(123)).toBe(false);
      expect(TypeDetectors.isObject(true)).toBe(false);
      expect(TypeDetectors.isObject(undefined)).toBe(false);
    });
  });

  describe('isPlainObject', () => {
    it('should detect plain objects', () => {
      expect(TypeDetectors.isPlainObject({})).toBe(true);
      expect(TypeDetectors.isPlainObject({ key: 'value' })).toBe(true);
    });

    it('should detect class instances as plain objects (ES5 behavior)', () => {
      class TestClass {}
      const instance = new TestClass();
      // In ES5 environment, class instances are treated as plain objects
      expect(TypeDetectors.isPlainObject(instance)).toBe(true);
    });

    it('should reject built-in objects', () => {
      expect(TypeDetectors.isPlainObject(new Date())).toBe(false);
      expect(TypeDetectors.isPlainObject(new Error())).toBe(false);
    });

    it('should reject arrays', () => {
      expect(TypeDetectors.isPlainObject([])).toBe(false);
    });
  });

  // ===== STAGE TYPE DETECTION TESTS =====

  describe('isStage', () => {
    it('should detect stage-like objects', () => {
      const stageLike = {
        run: () => {},
        execute: () => {},
        _isStage: true
      };
      expect(TypeDetectors.isStage(stageLike)).toBe(true);
      expect(isStage(stageLike)).toBe(true);
    });

    it('should reject objects without required methods', () => {
      expect(TypeDetectors.isStage({ run: () => {} })).toBe(false);
      expect(TypeDetectors.isStage({ execute: () => {} })).toBe(false);
      expect(TypeDetectors.isStage({ _isStage: true })).toBe(false);
    });

    it('should reject objects without _isStage marker', () => {
      const notStage = {
        run: () => {},
        execute: () => {}
      };
      expect(TypeDetectors.isStage(notStage)).toBe(false);
    });
  });

  // ===== BATCH DETECTION TESTS =====

  describe('detectType', () => {
    it('should detect null and undefined', () => {
      expect(detectType(null)).toEqual({ type: 'null', isValid: true });
      expect(detectType(undefined)).toEqual({ type: 'undefined', isValid: true });
    });

    it('should detect functions with subtypes', () => {
      function regularFunc() {}
      async function asyncFunc() {}

      expect(detectType(regularFunc)).toEqual({
        type: 'function',
        isValid: true,
        subtype: 'sync',
        confidence: 100
      });

      expect(detectType(asyncFunc)).toEqual({
        type: 'function',
        isValid: true,
        subtype: 'async',
        confidence: 100
      });
    });

    it('should detect arrays', () => {
      expect(detectType([])).toEqual({
        type: 'array',
        isValid: true,
        confidence: 100
      });
    });

    it('should detect promises', () => {
      const promise = Promise.resolve('test');
      expect(detectType(promise)).toEqual({
        type: 'promise',
        isValid: true,
        confidence: 95
      });
    });

    it('should detect errors', () => {
      const error = new Error('test');
      expect(detectType(error)).toEqual({
        type: 'error',
        isValid: true,
        confidence: 95
      });
    });

    it('should detect clean errors', () => {
      const cleanError: CleanError = {
        name: 'CleanError',
        message: 'clean error',
        isClean: true,
        chain: {}
      };
      expect(detectType(cleanError)).toEqual({
        type: 'cleanError',
        isValid: true,
        confidence: 100
      });
    });

    it('should detect primitive types', () => {
      expect(detectType('string')).toEqual({
        type: 'string',
        isValid: true,
        confidence: 100
      });

      expect(detectType(123)).toEqual({
        type: 'number',
        isValid: true,
        confidence: 100
      });

      expect(detectType(true)).toEqual({
        type: 'boolean',
        isValid: true,
        confidence: 100
      });
    });
  });

  // ===== UTILITY METHODS TESTS =====

  describe('isArray', () => {
    it('should detect arrays', () => {
      expect(TypeDetectors.isArray([])).toBe(true);
      expect(TypeDetectors.isArray([1, 2, 3])).toBe(true);
    });

    it('should reject non-arrays', () => {
      expect(TypeDetectors.isArray({})).toBe(false);
      expect(TypeDetectors.isArray('string')).toBe(false);
      expect(TypeDetectors.isArray(null)).toBe(false);
    });
  });

  describe('validateType', () => {
    it('should pass validation for correct types', () => {
      expect(() => TypeDetectors.validateType('string', 'string')).not.toThrow();
      expect(() => TypeDetectors.validateType(123, 'number')).not.toThrow();
    });

    it('should throw for incorrect types', () => {
      expect(() => TypeDetectors.validateType('string', 'number')).toThrow(TypeError);
      expect(() => TypeDetectors.validateType(123, 'string', 'param')).toThrow(
        "Expected 'param' to be string, got number"
      );
    });
  });

  describe('hasProperty', () => {
    it('should detect existing properties', () => {
      const obj = { key: 'value' };
      expect(TypeDetectors.hasProperty(obj, 'key')).toBe(true);
    });

    it('should reject non-existing properties', () => {
      const obj = { key: 'value' };
      expect(TypeDetectors.hasProperty(obj, 'missing')).toBe(false);
    });

    it('should reject non-objects', () => {
      expect(TypeDetectors.hasProperty('string', 'length')).toBe(false);
      expect(TypeDetectors.hasProperty(null, 'key')).toBe(false);
    });
  });

  describe('hasMethod', () => {
    it('should detect existing methods', () => {
      const obj = { method: () => {} };
      expect(TypeDetectors.hasMethod(obj, 'method')).toBe(true);
    });

    it('should reject non-function properties', () => {
      const obj = { prop: 'value' };
      expect(TypeDetectors.hasMethod(obj, 'prop')).toBe(false);
    });

    it('should reject non-existing properties', () => {
      const obj = {};
      expect(TypeDetectors.hasMethod(obj, 'missing')).toBe(false);
    });
  });

  // ===== ES5 COMPATIBILITY TESTS =====

  describe('ES5 Compatibility', () => {
    it('should work without modern JS features', () => {
      // Test that TypeDetectors works without ES6+ features
      const obj = { key: 'value' };
      const func = function() {};
      const arr = [1, 2, 3];

      expect(TypeDetectors.isObject(obj)).toBe(true);
      expect(TypeDetectors.isFunction(func)).toBe(true);
      expect(TypeDetectors.isArray(arr)).toBe(true);
    });

    it('should handle edge cases gracefully', () => {
      expect(() => TypeDetectors.isError(null)).not.toThrow();
      expect(() => TypeDetectors.isPromise(undefined)).not.toThrow();
      expect(() => TypeDetectors.isFunction({})).not.toThrow();
    });
  });
});