import { Possible } from './types/types';
export declare function CreateError(err: unknown | Array<unknown>): Possible<ComplexError>;
export declare function isComplexError(inp: unknown): inp is ComplexError;
export declare class ComplexError extends Error {
    payload: Array<unknown>;
    isComplex: boolean;
    constructor(...payload: Array<unknown>);
}
//# sourceMappingURL=ErrorList.d.ts.map