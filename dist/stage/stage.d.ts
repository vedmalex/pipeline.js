import { ContextType } from './Context';
import { StageConfig } from './StageConfig';
import { StageSymbol } from './getStageConfig';
import { AnyStage, CallbackFunction, EnsureFunction, RunPipelineFunction, StageObject, StageRun, ValidateFunction } from './types';
export declare class Stage<R extends StageObject, C extends StageConfig<R> = StageConfig<R>> implements AnyStage<R> {
    get config(): C;
    [StageSymbol]: boolean;
    protected _config: C;
    constructor();
    constructor(name: string);
    constructor(config: C);
    constructor(runFn: RunPipelineFunction<R>);
    constructor(stage: AnyStage<R>);
    get reportName(): string;
    toString(): string;
    get name(): string;
    execute<T extends StageObject>(context: T & R): Promise<T & R>;
    execute<T extends StageObject>(context: T & R, callback: CallbackFunction<T & R>): void;
    execute<T extends StageObject>(err: unknown, context: T & R, callback: CallbackFunction<T & R>): void;
    protected runStageMethod(err_: unknown, err: unknown, ctx: ContextType<R> | undefined, context: ContextType<R>, stageToRun: StageRun<R>, callback: CallbackFunction<ContextType<R>>): void;
    protected stage(err: unknown, context: ContextType<R>, callback: CallbackFunction<ContextType<R>>): void;
    protected run?: StageRun<R>;
    protected compile(rebuild?: boolean): StageRun<R>;
    protected rescue<T extends StageObject>(_err: unknown, context: ContextType<T>, fail: (err: unknown) => void, success: (ctx: ContextType<T>) => void): void;
    protected rescue_async<R extends StageObject>(_err: unknown, context: ContextType<R>): Promise<[unknown, ContextType<R>]>;
    protected validate(validate: ValidateFunction<R>, context: ContextType<R>, callback: CallbackFunction<ContextType<R>>): void;
    protected ensure(ensure: EnsureFunction<R>, context: ContextType<R>, callback: CallbackFunction<ContextType<R>>): void;
}
//# sourceMappingURL=stage.d.ts.map