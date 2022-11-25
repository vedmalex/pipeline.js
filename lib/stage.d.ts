import { ComplexError } from './utils/ErrorList';
import { CallbackFunction, EnsureFunction, Possible, RunPipelineFunction, StageConfig, StageObject, StageRun, ValidateFunction } from './utils/types';
import { ContextType } from './context';
import { AnyStage } from './utils/types';
export declare class Stage<T extends StageObject, C extends StageConfig<T> = StageConfig<T>> {
    get config(): C;
    protected _config: C;
    constructor();
    constructor(name: string);
    constructor(config: C);
    constructor(runFn: RunPipelineFunction<T>);
    constructor(stage: AnyStage<T>);
    get reportName(): string;
    get name(): string;
    protected runStageMethod(err_: Possible<ComplexError>, err: Possible<ComplexError>, ctx: T, context: T, stageToRun: StageRun<T>, callback: CallbackFunction<T>): void;
    execute(context: T): Promise<T>;
    execute(context: ContextType<T>): Promise<T>;
    execute(context: T, callback: CallbackFunction<T>): void;
    execute(context: ContextType<T>, callback: CallbackFunction<T>): void;
    execute(err: Possible<ComplexError>, context: T, callback: CallbackFunction<T>): void;
    protected stage(err: Possible<ComplexError>, context: T, callback: CallbackFunction<T>): void;
    compile(rebuild?: boolean): StageRun<T>;
    protected run?: StageRun<T>;
    protected rescue<E>(_err: Possible<Error | string>, context: E, fail: (err: Possible<ComplexError>) => void, success: (ctx: E) => void): void;
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