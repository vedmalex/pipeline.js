import { Possible } from './types';
export declare function CreateError<T extends {
    message: string;
}>(err: string | T | null | undefined | (string | T | null | undefined)[]): Possible<ComplexError>;
export declare type ComplexError = Error & {
    isComplex?: Boolean;
    errors?: Array<ComplexError>;
};
//# sourceMappingURL=ErrorList.d.ts.map