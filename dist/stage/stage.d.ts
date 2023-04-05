import { StageConfig } from './StageConfig';
import { StageSymbol } from './getStageConfig';
import { AnyStage, CallbackFunction, EnsureFunction, RunPipelineFunction, StageObject, StageRun, ValidateFunction } from './types';
export declare class Stage<R, C extends StageConfig<R> = StageConfig<R>> implements AnyStage<R> {
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
    execute<T extends StageObject>(context: T): Promise<T & R>;
    execute<T extends StageObject>(context: T | R, callback: CallbackFunction<T & R>): void;
    execute<T extends StageObject>(err: unknown, context: T, callback: CallbackFunction<T & R>): void;
    protected runStageMethod(err_: unknown, err: unknown, ctx: R, context: R, stageToRun: StageRun<R>, callback: CallbackFunction<R>): void;
    protected stage(err: unknown, context: R, callback: CallbackFunction<R>): void;
    protected run?: StageRun<R>;
    protected compile(rebuild?: boolean): StageRun<R>;
    protected rescue(_err: unknown, context: R, fail: (err: unknown) => void, success: (ctx: R) => void): void;
    protected rescue_async(_err: unknown, context: R): Promise<[unknown, unknown]>;
    protected validate(validate: ValidateFunction<R>, context: R, callback: CallbackFunction<R>): void;
    protected ensure(ensure: EnsureFunction<unknown>, context: R, callback: CallbackFunction<R>): void;
}
//# sourceMappingURL=stage.d.ts.map