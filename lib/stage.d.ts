import { ComplexError } from './utils/ErrorList';
import { CallbackExternalFunction, CallbackFunction, EnsureFunction, InternalStageRun, Possible, RunPipelineFunction, StageConfig, StageObject, StageRun, ValidateFunction } from './utils/types';
import { AnyStage } from './utils/types';
export declare const StageSymbol: unique symbol;
export declare function isStage<T extends StageObject, C extends StageConfig<T> = StageConfig<T>>(obj: any): obj is Stage<T, C>;
export declare class Stage<T extends StageObject, C extends StageConfig<T> = StageConfig<T>> {
    get config(): C;
    [StageSymbol]: boolean;
    protected _config: C;
    constructor();
    constructor(name: string);
    constructor(config: C);
    constructor(runFn: RunPipelineFunction<T>);
    constructor(stage: AnyStage<T>);
    get reportName(): string;
    get name(): string;
    protected runStageMethod(err_: Possible<ComplexError>, err: Possible<ComplexError>, ctx: T, context: T, stageToRun: InternalStageRun<T>, callback: CallbackFunction<T>): void;
    execute(context: T): Promise<T>;
    execute(context: T, callback: CallbackExternalFunction<T>): void;
    execute(context: T, callback: CallbackExternalFunction<T>): void;
    execute(err: Possible<ComplexError>, context: T, callback: CallbackExternalFunction<T>): void;
    protected stage(err: Possible<ComplexError>, context: T, callback: CallbackFunction<T>): void;
    compile(rebuild?: boolean): StageRun<T>;
    protected run?: InternalStageRun<T>;
    protected rescue<E>(_err: Possible<Error | string>, context: T, fail: (err: Possible<ComplexError>) => void, success: (ctx: T) => void): void;
    toString(): string;
    protected validate(validate: ValidateFunction<T>, context: T, callback: CallbackFunction<T>): void;
    protected ensure(ensure: EnsureFunction<T>, context: T, callback: CallbackFunction<T>): void;
}
export type EnsureParams<T> = {
    context: T;
    callback: CallbackFunction<T> | undefined;
    err: Possible<ComplexError>;
    is_promise: boolean;
};
//# sourceMappingURL=stage.d.ts.map