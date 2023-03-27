import { Possible } from './types/types';
export declare function CreateError(err: Error | object | Array<Error | object | string> | string): Possible<ComplexError>;
export declare function isComplexError(inp: unknown): inp is ComplexError;
export declare class ComplexError extends Error {
    payload: Array<Error | object | string>;
    isComplex: boolean;
    constructor(...payload: Array<Error | object | string>);
}
//# sourceMappingURL=ErrorList.d.ts.map