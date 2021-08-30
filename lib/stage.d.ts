import { AllowedStage, CallbackFunction, EnsureFunction, StageConfig, StageRun, ValidateFunction, Possible } from './utils/types';
export declare class Stage<T, C extends StageConfig<T, R>, R = T> {
    get config(): C;
    protected _config: C;
    constructor(config?: AllowedStage<T, C, R>);
    get reportName(): string;
    get name(): string;
    protected runStageMethod(err_: Possible<Error>, err: Possible<Error>, ctx: Possible<T>, context: T, stageToRun: StageRun<T, R>, callback: CallbackFunction<R>): void;
    execute(context: Possible<T>): Promise<Possible<R>>;
    execute(context: Possible<T>, callback: CallbackFunction<R>): void;
    execute(err: Possible<Error>, context: Possible<T>, callback: CallbackFunction<R>): void;
    protected stage(err: Possible<Error>, context: Possible<T>, callback: CallbackFunction<R>): void;
    compile(rebuild?: boolean): StageRun<T, R>;
    protected run?: StageRun<T, R>;
    protected rescue<E>(_err: Possible<Error | string>, context: Possible<E>, fail: (err: Possible<Error>) => void, success: (ctx: Possible<E>) => void): void;
    toString(): string;
    protected validate(validate: ValidateFunction<T>, context: T, callback: CallbackFunction<T>): void;
    protected ensure(ensure: EnsureFunction<T>, context: T, callback: CallbackFunction<T>): void;
}
export declare type EnsureParams<T> = {
    context: T;
    callback: CallbackFunction<T> | undefined;
    err: Possible<Error>;
    is_promise: boolean;
};
//# sourceMappingURL=stage.d.ts.map