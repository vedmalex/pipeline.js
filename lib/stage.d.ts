import { AllowedStage, CallbackFunction, EnsureFunction, StageConfig, StageRun, ValidateFunction } from './utils/types';
export declare class Stage<T = any, C extends StageConfig<T, R> = any, R = T> {
    get config(): C;
    protected _config: C;
    constructor(config?: AllowedStage<T, C, R>);
    get reportName(): string;
    get name(): string;
    execute(context: T): Promise<R | T>;
    execute(context: T, callback: CallbackFunction<R | T>): void;
    execute(err: Error | undefined, context: T, callback: CallbackFunction<R | T>): void;
    protected stage(err: Error | undefined, context: T, callback: CallbackFunction<T | R>): void;
    compile(rebuild?: boolean): StageRun<T, R>;
    protected run?: StageRun<T, R>;
    protected rescue(err: Error | undefined, context: T, callback: CallbackFunction<T | R>): void;
    toString(): string;
    protected validate(validate: ValidateFunction<T>, context: T, callback: CallbackFunction<T>): void;
    protected ensure(ensure: EnsureFunction<T>, context: T, callback: CallbackFunction<T>): void;
}
export declare type EnsureParams<T, R> = {
    context: T;
    callback: CallbackFunction<R> | undefined;
    err: Error | undefined;
    is_promise: boolean;
};
//# sourceMappingURL=stage.d.ts.map