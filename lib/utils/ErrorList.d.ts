import { Possible } from './types';
export interface ErrorContext {
    stage?: string;
    operation?: string;
    timestamp?: number;
    metadata?: Record<string, unknown>;
}
export interface ErrorChain {
    primary: Error;
    secondary?: Error[];
    context?: ErrorContext;
    trace?: string[];
}
export interface ErrorOptions {
    secondary?: Error[];
    context?: ErrorContext;
    cause?: Error;
}
export declare class CleanError extends Error {
    readonly chain: ErrorChain;
    readonly isClean = true;
    constructor(primary: Error | string, options?: ErrorOptions);
    getPrimaryError(): Error;
    getSecondaryErrors(): Error[];
    getContext(): ErrorContext | undefined;
    get cause(): any;
    set cause(value: any);
    toString(): string;
    toJSON(): object;
}
export declare function createError(input: string | Error | Error[]): CleanError;
export declare function createErrorWithContext(error: Error, context: ErrorContext): CleanError;
export declare function chainErrors(primary: Error, secondary: Error[]): CleanError;
export declare function isCleanError(input: any): input is CleanError;
export declare function isErrorChain(input: any): input is CleanError;
export declare function extractPrimaryError(error: CleanError): Error;
export declare function getErrorContext(error: CleanError): ErrorContext | undefined;
export { CleanError as ComplexError };
export declare function CreateError(err: string | Error | CleanError | null | undefined | (string | Error | CleanError | null | undefined)[]): Possible<CleanError>;
export declare function isComplexError(inp: any): inp is CleanError;
export declare function benchmarkErrorCreation(iterations?: number): {
    cleanErrorTime: number;
    complexErrorTime: number;
    improvement: string;
};
//# sourceMappingURL=ErrorList.d.ts.map