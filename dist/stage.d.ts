import { CallbackFunction, EnsureFunction, AnyStage, RunPipelineFunction, StageConfig, StageRun, ValidateFunction, StageObject } from './utils/types/types';
export declare const StageSymbol: unique symbol;
export declare function isStage(obj: unknown): boolean;
export declare class Stage<R, C extends StageConfig<R>> implements AnyStage {
    get config(): C;
    [StageSymbol]: boolean;
    protected _config: C;
    constructor();
    constructor(name: string);
    constructor(config: C);
    constructor(runFn: RunPipelineFunction<R>);
    constructor(stage: AnyStage);
    get reportName(): string;
    get name(): string;
    execute<T extends StageObject>(context: T): Promise<T>;
    execute<T extends StageObject>(context: T, callback: CallbackFunction<T>): void;
    execute<T extends StageObject>(err: unknown, context: T, callback: CallbackFunction<T>): void;
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