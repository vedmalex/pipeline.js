export declare function CreateError(err: string | object | undefined | (string | object | undefined)[]): Error | undefined;
export declare class ErrorList extends Error {
    errors: Array<{
        message: string;
    }>;
    constructor(_list: Array<any> | any);
    get message(): string;
}
//# sourceMappingURL=ErrorList.d.ts.map