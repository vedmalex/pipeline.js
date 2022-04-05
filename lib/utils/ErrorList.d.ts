import { Possible } from './types';
export declare function CreateError<T extends {
    message: string;
}>(err: string | T | null | undefined | (string | T | null | undefined)[]): Possible<ComplexError>;
export declare class ComplexError<T extends {
    [key: string]: any;
} = any> extends Error {
    payload: T;
    isComplex: boolean;
    [key: string]: any;
    constructor(payload: T);
}
//# sourceMappingURL=ErrorList.d.ts.map