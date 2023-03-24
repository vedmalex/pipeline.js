import { JSONSchemaType } from 'ajv';
export type StageObject = object;
export type CombineFunction<T> = <R>(ctx: T, children: R[]) => T;
export type SplitFunction<T> = <R>(ctx: T) => R[];
export type EvaluateFunction<T> = (ctx: T) => boolean;
export type CallbackFunction<R> = (err?: unknown, res?: R | unknown) => void;
export declare function isCallback<R>(inp?: unknown): inp is CallbackFunction<R>;
export declare function isExternalCallback<T>(inp?: unknown): inp is CallbackFunction<T>;
export declare function is_async_function(inp?: unknown): boolean;
export declare function is_func1Callback<R>(inp?: unknown): inp is Func1Sync<R>;
export type Func0Sync<R> = () => R;
export type Func1Sync<R> = (ctx: R) => R;
export type Func2Sync<R> = (ctx: R, done: CallbackFunction<R>) => R;
export type Func3Sync<R> = (err: unknown, ctx: R, p3: CallbackFunction<R>) => void;
export type FuncSync<R> = Func0Sync<R> | Func1Sync<R> | Func2Sync<R> | Func3Sync<R>;
export type Func0Async<R> = () => Promise<R>;
export type Func1Async<R> = (p1: R) => Promise<R>;
export type Func2Async<R> = (p1: unknown, p2: R) => Promise<R>;
export type Func3Async<R> = (p1: unknown, p2: unknown, p3: unknown) => Promise<R>;
export type FuncAsync<R> = Func0Async<R> | Func1Async<R> | Func2Async<R> | Func3Async<R>;
export type Func0<R> = Func0Sync<R> | Func0Async<R>;
export type Func1<R> = Func1Sync<R> | Func1Async<R>;
export type Func2<R> = Func2Sync<R> | Func2Async<R>;
export type Func3<R> = Func3Sync<R> | Func3Async<R>;
export type Func<R> = FuncSync<R> | FuncAsync<R>;
export declare function is_async<R>(inp?: unknown): inp is FuncAsync<R>;
export declare function is_func0<R>(inp?: unknown): inp is Func0Sync<R>;
export declare function is_func1<R>(inp?: unknown): inp is Func1Sync<R>;
export declare function is_func2<R>(inp?: unknown): inp is Func2Sync<R>;
export declare function is_func3<R>(inp?: unknown): inp is Func3Sync<R>;
export declare function is_func0_async<R>(inp: unknown): inp is Func0Async<R>;
export declare function is_func1_async<R>(inp: unknown): inp is Func1Async<R>;
export declare function is_func2_async<R>(inp?: unknown): inp is Func2Async<R>;
export declare function is_func3_async<R>(inp?: unknown): inp is Func3Async<R>;
export type Thanable<T> = {
    then: Promise<T>['then'];
    catch: Promise<T>['catch'];
};
export declare function is_thenable<T>(inp?: any): inp is Thanable<T>;
export type Possible<T> = T | undefined | null;
export type SingleStageFunction<R> = Func2Async<R> | Func3Sync<R>;
export declare function isSingleStageFunction<R>(inp?: unknown): inp is SingleStageFunction<R>;
export type ValidateFunction = (() => boolean) | ((value: unknown) => boolean) | ((value: unknown) => Promise<boolean>) | ((value: unknown) => Thanable<boolean>) | ((value: unknown, callback: CallbackFunction<boolean>) => void);
export declare function isValidateFunction(inp: any): inp is ValidateFunction;
export type CustomRun0Sync<R> = () => R;
export type CustomRun0Async<R> = () => Promise<R>;
export type CustomRun1Sync<R> = (ctx: R) => R;
export type CustomRun1Async<R> = (ctx: R) => Promise<R>;
export type CustomRun2Async<R> = (err: unknown, ctx: R) => Promise<R>;
export type CustomRun2Callback<R> = (ctx: R, done: CallbackFunction<R>) => void;
export type CustomRun3Callback<R> = (err: unknown, ctx: R, done: CallbackFunction<R>) => void;
export type RunPipelineFunction<R> = CustomRun0Sync<R> | CustomRun0Async<R> | CustomRun1Async<R> | CustomRun1Sync<R> | CustomRun2Callback<R> | CustomRun2Async<R> | CustomRun3Callback<R>;
export declare function isCustomRun0Sync<R>(inp: unknown): inp is CustomRun0Sync<R>;
export declare function isCustomRun0Async<R>(inp: unknown): inp is CustomRun0Async<R>;
export declare function isCustomRun1Async<R>(inp: unknown): inp is CustomRun1Async<R>;
export declare function isCustomRun1Sync<R>(inp: unknown): inp is CustomRun1Sync<R>;
export declare function isCustomRun2Callback<R>(inp: unknown): inp is CustomRun2Callback<R>;
export declare function isCustomRun2Async<R>(inp: unknown): inp is CustomRun2Async<R>;
export declare function isCustomRun3Callback<R>(inp: unknown): inp is CustomRun3Callback<R>;
export declare function isRunPipelineFunction<R>(inp: any): inp is RunPipelineFunction<R>;
export type Rescue1Sync<R> = (ctx: R) => R;
export type Rescue1ASync<R> = (ctx: R) => Promise<R>;
export type Rescue2ASync<R> = (err: unknown, ctx: R) => Promise<R>;
export type Rescue2Sync<R> = (err: unknown, ctx: R) => R;
export type Rescue3Callback<R> = (err: unknown, ctx: R, done: CallbackFunction<R>) => void;
export type Rescue<R> = Rescue1Sync<R> | Rescue1ASync<R> | Rescue2ASync<R> | Rescue2Sync<R> | Rescue3Callback<R>;
export declare function isRescue1Sync<R>(inp: unknown): inp is Rescue1Sync<R>;
export declare function isRescue1ASync<R>(inp: unknown): inp is Rescue1ASync<R>;
export declare function isRescue2ASync<R>(inp: unknown): inp is Rescue2ASync<R>;
export declare function isRescue3Callback<R>(inp: unknown): inp is Rescue3Callback<R>;
export declare function isRescue2Sync<R>(inp: unknown): inp is Rescue2Sync<R>;
export declare function isRescue<R>(inp: unknown): inp is Rescue<R>;
export type ValidateSync<R> = (ctx: R) => R;
export type ValidateAsync<R> = (ctx: R) => Promise<R>;
export type ValidateCallback<R> = (ctx: R, done: CallbackFunction<R>) => void;
export type Validate<R> = ValidateSync<R> | ValidateAsync<R> | ValidateCallback<R>;
export declare function isValidateSync<R>(inp: unknown): inp is ValidateSync<R>;
export declare function isValidateAsync<R>(inp: unknown): inp is ValidateAsync<R>;
export declare function isValidateCallback<R>(inp: unknown): inp is ValidateCallback<R>;
export declare function isValidate<R>(inp: unknown): inp is Validate<R>;
export type Callback0Sync<R> = () => R;
export type Callback0Async<R> = () => Promise<R>;
export type Callback1Sync<R> = (ctx: R) => R;
export type Callback1Async<R> = (ctx: R) => Promise<R>;
export type Callback2Async<R> = (err: unknown, ctx: R) => Promise<R>;
export type Callback2Callback<R> = (ctx: R, done: CallbackFunction<R>) => void;
export type Callback3Callback<R> = (err: unknown, ctx: R, done: CallbackFunction<R>) => void;
export type StageCallback<R> = Callback0Sync<R> | Callback0Async<R> | Callback1Async<R> | Callback1Sync<R> | Callback2Callback<R> | Callback2Async<R> | Callback3Callback<R>;
export declare function isCallback0Sync<R>(inp: unknown): inp is Callback0Sync<R>;
export declare function isCallback0Async<R>(inp: unknown): inp is Callback0Async<R>;
export declare function isCallback1Async<R>(inp: unknown): inp is Callback1Async<R>;
export declare function isCallback1Sync<R>(inp: unknown): inp is Callback1Sync<R>;
export declare function isCallback2Callback<R>(inp: unknown): inp is Callback2Callback<R>;
export declare function isCallback2Async<R>(inp: unknown): inp is Callback2Async<R>;
export declare function isCallback3Callback<R>(inp: unknown): inp is Callback3Callback<R>;
export declare function isStageCallbackFunction<R>(inp: any): inp is StageCallback<R>;
export type EnsureSync<R> = (ctx: R) => R;
export type EnsureAsync<R> = (ctx: R) => Promise<R>;
export type EnsureCallback<R> = (ctx: R, done: CallbackFunction<R>) => void;
export type EnsureFunction<R> = EnsureSync<R> | EnsureAsync<R> | EnsureCallback<R>;
export declare function isEnsureSync<R>(inp: unknown): inp is EnsureSync<R>;
export declare function isEnsureAsync<R>(inp: unknown): inp is EnsureAsync<R>;
export declare function isEnsureCallback<R>(inp: unknown): inp is EnsureCallback<R>;
export declare function isEnsureFunction<R>(inp: unknown): inp is EnsureFunction<R>;
export interface StageConfig<R> {
    run?: RunPipelineFunction<R>;
    name?: string;
    rescue?: Rescue<R>;
    schema?: JSONSchemaType<unknown>;
    ensure?: EnsureFunction<R>;
    validate?: ValidateFunction;
    compile?(rebuild: boolean): StageRun<R>;
    precompile?(): void;
}
export interface PipelineConfig<R> extends StageConfig<R> {
    stages: Array<AnyStage | RunPipelineFunction<R>>;
}
export interface ParallelConfig<R> extends StageConfig<R> {
    stage: AnyStage | RunPipelineFunction<R>;
    split?: SplitFunction<R>;
    combine?: CombineFunction<R>;
}
export declare function isStageRun<R>(inp: unknown): inp is StageRun<R>;
export type StageRun<R> = (err: unknown, context: unknown, callback: CallbackFunction<R>) => void;
export type AllowedStage<R, CONFIG extends StageConfig<R>> = string | CONFIG | RunPipelineFunction<R> | AnyStage;
export declare function isAllowedStage<R, C extends StageConfig<R>>(inp: any): inp is AllowedStage<R, C>;
export declare function getStageConfig<R, C extends StageConfig<R>>(config: AllowedStage<R, C>): C | AnyStage;
export declare function getNameFrom<R, C extends StageConfig<R>>(config: C): string;
export type AllowedPipeline<R> = AllowedStage<R, PipelineConfig<R>> | Array<RunPipelineFunction<R> | AnyStage>;
export declare function getPipelinConfig<R, C extends PipelineConfig<R>>(config: AllowedPipeline<R>): C;
export declare function getParallelConfig<R, C extends ParallelConfig<R>>(config: AllowedStage<R, C>): C;
export declare function getEmptyConfig<R, C extends StageConfig<R>>(config: AllowedStage<R, C>): AnyStage | C;
export interface WrapConfig<R> extends StageConfig<R> {
    stage: AnyStage | RunPipelineFunction<R>;
    prepare?: (ctx: unknown) => unknown;
    finalize?: (ctx: unknown, retCtx: unknown) => unknown;
}
export declare function getWrapConfig<R, C extends WrapConfig<R>>(config: AllowedStage<R, C>): C;
export interface TimeoutConfig<R> extends StageConfig<R> {
    timeout?: number | Func1Sync<R>;
    stage?: AnyStage | RunPipelineFunction<R>;
    overdue?: AnyStage | RunPipelineFunction<R>;
}
export declare function getTimeoutConfig<R, C extends TimeoutConfig<R>>(config: AllowedStage<R, C>): C;
export interface IfElseConfig<R> extends StageConfig<R> {
    condition?: boolean | ValidateFunction;
    success?: AnyStage | RunPipelineFunction<R>;
    failed?: AnyStage | RunPipelineFunction<R>;
}
export declare function getIfElseConfig<R, C extends IfElseConfig<R>>(config: AllowedStage<R, C>): C;
export interface AnyStage {
    get reportName(): string;
    toString(): string;
    get name(): string;
    execute<T>(context: unknown): Promise<T>;
    execute<T>(context: unknown, callback: CallbackFunction<T>): void;
    execute<T>(err: unknown, context: unknown, callback: CallbackFunction<T>): void;
    execute<T>(_err?: unknown, _context?: unknown, _callback?: unknown): void | Promise<T>;
}
export declare function isAnyStage(obj: unknown): obj is AnyStage;
export interface DoWhileConfig<R> extends StageConfig<R> {
    stage: AnyStage | SingleStageFunction<R>;
    split?: <T>(ctx: T, iter: number) => unknown[];
    reachEnd?: <T, R>(p1: unknown, p2: unknown, p3: unknown) => boolean;
}
export declare function getDoWhileConfig<R, C extends DoWhileConfig<R>>(_config: AnyStage | C | SingleStageFunction<R>): C;
export interface RetryOnErrorConfig<R> extends StageConfig<R> {
    stage: AnyStage | RunPipelineFunction<R>;
    retry: number | (<T>(p1: unknown, p2: T, p3: number) => boolean);
    backup?: <T extends object>(ctx: unknown) => T;
    restore?: <T extends object>(ctx: unknown, backup: unknown) => T;
}
export declare function getRetryOnErrorConfig<R, C extends RetryOnErrorConfig<R>>(config: AllowedStage<R, C>): C;
//# sourceMappingURL=types.d.ts.map