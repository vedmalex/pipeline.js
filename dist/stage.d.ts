import { CallbackFunction, EnsureFunction, AnyStage, RunPipelineFunction, StageConfig, StageRun, ValidateFunction, StageObject } from './utils/types/types';
export declare const StageSymbol: unique symbol;
export declare function isStage(obj: unknown): boolean;
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
    get name(): string;
    execute<T extends StageObject>(context: T): Promise<T & R>;
    execute<T extends StageObject>(context: T | R, callback: CallbackFunction<T & R>): void;
    execute<T extends StageObject>(err: unknown, context: T, callback: CallbackFunction<T & R>): void;
    protected runStageMethod(err_: unknown, err: unknown, ctx: unknown, context: unknown, stageToRun: StageRun<R>, callback: CallbackFunction<R>): void;
    protected stage(err: unknown, context: unknown, callback: CallbackFunction<R>): void;
    protected compile(rebuild?: boolean): StageRun<R>;
    protected run?: StageRun<R>;
    protected rescue(_err: unknown, context: unknown, fail: (err: unknown) => void, success: (ctx: unknown) => void): void;
    toString(): string;
    protected validate(validate: ValidateFunction, context: unknown, callback: CallbackFunction<R>): void;
    protected ensure(ensure: EnsureFunction<unknown>, context: unknown, callback: CallbackFunction<R>): void;
}
//# sourceMappingURL=stage.d.ts.map