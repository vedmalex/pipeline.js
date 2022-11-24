import { AllowedStage, CallbackFunction, EnsureFunction, Possible, StageConfig, StageObject, StageRun, ValidateFunction } from './utils/types';
import { ContextType } from './context';
export declare class Stage<T extends StageObject, C extends StageConfig<T>> {
    get config(): C;
    protected _config: C;
    constructor(config?: AllowedStage<T, C>);
    get reportName(): string;
    get name(): string;
    protected runStageMethod(err_: Possible<Error>, err: Possible<Error>, ctx: Possible<T>, context: T, stageToRun: StageRun<T>, callback: CallbackFunction<T>): void;
    execute(context: Possible<T | ContextType<T>>): Promise<Possible<T>>;
    execute(context: Possible<T | ContextType<T>>, callback: CallbackFunction<T>): void;
    execute(err: Possible<Error>, context: Possible<T>, callback: CallbackFunction<T>): void;
    protected stage(err: Possible<Error>, context: Possible<T>, callback: CallbackFunction<T>): void;
    compile(rebuild?: boolean): StageRun<T>;
    protected run?: StageRun<T>;
    protected rescue<E>(_err: Possible<Error | string>, context: Possible<E>, fail: (err: Possible<Error>) => void, success: (ctx: Possible<E>) => void): void;
    toString(): string;
    protected validate(validate: ValidateFunction<T>, context: T, callback: CallbackFunction<T>): void;
    protected ensure(ensure: EnsureFunction<T>, context: T, callback: CallbackFunction<T>): void;
}
export type EnsureParams<T> = {
    context: T;
    callback: CallbackFunction<T> | undefined;
    err: Possible<Error>;
    is_promise: boolean;
};
//# sourceMappingURL=stage.d.ts.map