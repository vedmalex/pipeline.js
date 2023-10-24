export declare class ComplexError extends Error {
    payload: Array<Error | object | string>;
    isComplex: boolean;
    constructor(...payload: Array<Error | object | string>);
}
export declare function isComplexError(inp: unknown): inp is ComplexError;
export declare function CreateError(_err: Error | object | Array<Error | object | string> | string | unknown | null | undefined): ComplexError | undefined;
export declare const ERROR: {
    signature: string;
    invalid_context: string;
    argements_error: string;
    not_implemented: string;
    rescue_MUST_return_value: string;
    define_stage_before_use_of_rescue: string;
    operation_timeout_occured: string;
};
export type ParallelErrorInput = {
    index: number;
    err: unknown;
    ctx: unknown;
};
export declare class ParallelError extends Error {
    index: number;
    err: unknown;
    ctx: unknown;
    constructor(init: ParallelErrorInput);
    toString(): string;
}
