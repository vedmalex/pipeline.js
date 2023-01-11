import { Possible } from './types';
export declare function CreateError(err: string | Error | ComplexError | null | undefined | (string | Error | ComplexError | null | undefined)[]): Possible<ComplexError>;
export declare function isComplexError(inp: any): inp is ComplexError;
export declare class ComplexError extends Error {
    payload: Array<Error>;
    isComplex: boolean;
    constructor(...payload: Array<Error>);
}
//# sourceMappingURL=ErrorList.d.ts.map