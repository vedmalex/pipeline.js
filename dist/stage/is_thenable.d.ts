export type Thanable<T> = {
    then: Promise<T>['then'];
    catch: Promise<T>['catch'];
};
export declare function is_thenable<T>(inp?: any): inp is Thanable<T>;
//# sourceMappingURL=is_thenable.d.ts.map