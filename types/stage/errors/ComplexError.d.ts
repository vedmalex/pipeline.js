export type ComplexErrorInput = Error | object | string | unknown | null | undefined;
export declare class ComplexError extends Error {
    payload: Array<ComplexErrorInput>;
    isComplex: boolean;
    constructor(...payload: Array<ComplexErrorInput>);
}
