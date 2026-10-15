export interface TypeDetectionResult {
    type: string;
    isValid: boolean;
    subtype?: string;
    confidence?: number;
}
export interface CleanError extends Error {
    isClean: boolean;
    chain: any;
}
export declare class TypeDetectors {
    static isError(value: any): value is Error;
    static isCleanError(value: any): value is CleanError;
    static isPromise(value: any): value is Promise<any>;
    static isThenable(value: any): value is {
        then: Function;
    };
    static isFunction(value: any): value is Function;
    static isAsyncFunction(value: any): value is (...args: any[]) => Promise<any>;
    static isObject(value: any): value is object;
    static isPlainObject(value: any): value is Record<string, any>;
    static isStage(value: any): boolean;
    static detectType(value: any): TypeDetectionResult;
    static isArray(value: any): value is any[];
    static validateType(value: any, expectedType: string, paramName?: string): void;
    static hasProperty(obj: any, prop: string): boolean;
    static hasMethod(obj: any, methodName: string): boolean;
    static isDate(value: any): value is Date;
    static isTypeError(value: any): value is TypeError;
    static isBuffer(value: any): value is Buffer;
}
export default TypeDetectors;
export declare const { isError, isCleanError, isPromise, isThenable, isFunction, isAsyncFunction, isObject, isPlainObject, isStage, isArray, detectType, validateType, hasProperty, hasMethod, isDate, isTypeError, isBuffer, }: typeof TypeDetectors;
//# sourceMappingURL=TypeDetectors.d.ts.map