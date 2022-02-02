import { JSONSchemaType } from 'ajv';
import { Stage } from '../stage';
import { Parallel } from 'src/parallel';
import { Pipeline } from 'src/pipeline';
import { DoWhile } from '../dowhile';
import { Empty } from '../empty';
import { IfElse } from '../ifelse';
import { MultiWaySwitch } from '../multiwayswitch';
import { RetryOnError } from '../retryonerror';
import { Sequential } from '../sequential';
import { Timeout } from '../timeout';
import { Wrap } from '../wrap';
export declare type StageObject = Record<string | symbol, any>;
export declare type Func0Sync<R> = () => R;
export declare type Func1Sync<R, P1> = (p1: P1) => R;
export declare type Func2Sync<R, P1, P2> = (p1: P1, p2: P2) => R;
export declare type Func3Sync<R, P1, P2, P3> = (p1: P1, p2: P2, p3: P3) => R;
export declare type FuncSync<R, P1 = void, P2 = void, P3 = void> = Func0Sync<R> | Func1Sync<R, P1> | Func2Sync<R, P1, P2> | Func3Sync<R, P1, P2, P3>;
export declare type Func0Async<R> = Func0Sync<Promise<R>>;
export declare type Func1Async<R, P1> = Func1Sync<Promise<R>, P1>;
export declare type Func2Async<R, P1, P2> = Func2Sync<Promise<R>, P1, P2>;
export declare type Func3Async<R, P1, P2, P3> = Func3Sync<Promise<R>, P1, P2, P3>;
export declare type FuncAsync<R, P1, P2, P3> = Func0Async<R> | Func1Async<R, P1> | Func2Async<R, P1, P2> | Func3Async<R, P1, P2, P3>;
export declare type Func0<R> = Func0Sync<R> | Func0Async<R>;
export declare type Func1<R, P1> = Func1Sync<R, P1> | Func1Async<R, P1>;
export declare type Func2<R, P1, P2> = Func2Sync<R, P1, P2> | Func2Async<R, P1, P2>;
export declare type Func3<R, P1, P2, P3> = Func3Sync<R, P1, P2, P3> | Func3Async<R, P1, P2, P3>;
export declare type Func<R, P1, P2, P3> = FuncSync<R, P1, P2, P3> | FuncAsync<R, P1, P2, P3>;
export declare function is_async<R, P1 = void, P2 = void, P3 = void>(inp?: Function): inp is FuncAsync<R, P1, P2, P3>;
export declare function is_func0<R>(inp?: Function): inp is Func0Sync<R>;
export declare function is_func1<R, P1>(inp?: Function): inp is Func1Sync<R, P1>;
export declare function is_func2<R, P1, P2>(inp?: Function): inp is Func2Sync<R, P1, P2>;
export declare function is_func3<R, P1, P2, P3>(inp?: Function): inp is Func3Sync<R, P1, P2, P3>;
export declare function is_func0_async<T>(inp: Function): inp is Func0Async<T>;
export declare function is_func1_async<R, P1>(inp: Function): inp is Func1Async<R, P1>;
export declare function is_func2_async<R, P1, P2>(inp?: Function): inp is Func2Async<R, P1, P2>;
export declare function is_func3_async<R, P1, P2, P3>(inp?: Function): inp is Func3Async<R, P1, P2, P3>;
export declare type Thanable<T> = {
    then: Promise<T>['then'];
    catch: Promise<T>['catch'];
};
export declare function is_thenable<T>(inp?: any): inp is Thanable<T>;
export declare type Possible<T> = T | undefined | null;
export declare type CallbackFunction<T> = (err?: Possible<Error>, res?: Possible<T>) => void;
export declare type SingleStageFunction<T, R> = Func2Async<R, Possible<Error>, Possible<T>> | Func3Sync<void, Possible<Error>, Possible<T>, CallbackFunction<R>>;
export declare function isSingleStageFunction<T, R>(inp?: any): inp is SingleStageFunction<T, R>;
export declare type RunPipelineFunction<T, R> = Func0Async<R> | Func0Sync<R | Promise<R> | Thanable<R>> | Func1Async<R, Possible<T>> | Func1Sync<R | Promise<R> | Thanable<R>, Possible<T>> | Func2Async<R, Possible<Error>, Possible<T>> | Func2Sync<void, Possible<T>, CallbackFunction<R>> | Func3Sync<void, Possible<Error>, Possible<T>, CallbackFunction<R>>;
export declare function isRunPipelineFunction<T, R>(inp: any): inp is RunPipelineFunction<T, R>;
export declare type Rescue<T> = Func1Async<T, Error> | Func1Sync<T | Promise<T> | Thanable<T>, Error> | Func2Async<T, Possible<Error>, Possible<T>> | Func2Sync<T | Promise<T> | Thanable<T>, Error, Possible<T>> | Func3Sync<void, Error, Possible<T>, CallbackFunction<T>>;
export declare function isRescue<T>(inp: any): inp is Rescue<T>;
export declare type ValidateFunction<T> = Func1Sync<boolean | Promise<boolean> | Thanable<boolean>, T> | Func1Async<boolean, T> | Func2Sync<void, T, CallbackFunction<boolean>>;
export declare function isValidateFunction<T>(inp: any): inp is ValidateFunction<T>;
export declare type EnsureFunction<T> = Func1Sync<T | Promise<T> | Thanable<T>, T> | Func1Async<T, T> | Func2Sync<void, T, CallbackFunction<T>>;
export declare function isEnsureFunction<T>(inp: any): inp is EnsureFunction<T>;
export interface StageConfig<T, R> {
    run?: RunPipelineFunction<T, R>;
    name?: string;
    rescue?: Rescue<T>;
    schema?: JSONSchemaType<T>;
    ensure?: EnsureFunction<T>;
    validate?: ValidateFunction<T>;
    compile?<C extends StageConfig<T, R>>(this: Stage<T, C, R>, rebuild: boolean): StageRun<T, R>;
    precompile?<C extends StageConfig<T, R>>(this: C): void;
}
export interface PipelineConfig<T, R> extends StageConfig<T, R> {
    stages: Array<AnyStage<unknown, unknown> | RunPipelineFunction<unknown, unknown>>;
}
export interface ParallelConfig<T, R> extends StageConfig<T, R> {
    stage: AnyStage<T, R> | RunPipelineFunction<T, R>;
    split?: Func1Sync<Array<R>, Possible<T>>;
    combine?: Func2Sync<Possible<R> | void, Possible<T>, Array<any>>;
}
export declare function isStageRun<T, R>(inp: Function): inp is StageRun<T, R>;
export declare type StageRun<T, R> = (err: Possible<Error>, context: Possible<T>, callback: CallbackFunction<R>) => void;
export declare type AllowedStage<T, C extends StageConfig<T, R>, R> = string | C | RunPipelineFunction<T, R> | AnyStage<T, R>;
export declare function isAllowedStage<T, C extends StageConfig<T, R>, R>(inp: any): inp is AllowedStage<T, C, R>;
export declare function getStageConfig<T, C extends StageConfig<T, R>, R>(config: AllowedStage<T, C, R>): C | AnyStage<T, R>;
export declare function getNameFrom<T, C extends StageConfig<T, R>, R>(config: C): string;
export declare type AllowedPipeline<T, R> = AllowedStage<T, PipelineConfig<T, R>, R> | Array<RunPipelineFunction<T, R> | AnyStage<T, R>>;
export declare function getPipelinConfig<T, R>(config: AllowedPipeline<T, R>): PipelineConfig<T, R>;
export declare function getParallelConfig<T, R>(config: AllowedStage<T, ParallelConfig<T, R>, R>): ParallelConfig<T, R>;
export declare function getEmptyConfig<T, R>(config: AllowedStage<T, StageConfig<T, R>, R>): AnyStage<T, R> | StageConfig<T, R>;
export interface WrapConfig<T, R> extends StageConfig<T, R> {
    stage: AnyStage<unknown, unknown> | RunPipelineFunction<unknown, unknown>;
    prepare: (ctx: Possible<T>) => unknown;
    finalize: (ctx: Possible<T>, retCtx: unknown) => Possible<R>;
}
export declare function getWrapConfig<T, C extends WrapConfig<T, R>, R>(config: AllowedStage<T, C, R>): C;
export interface TimeoutConfig<T, R> extends StageConfig<T, R> {
    timeout?: number | Func1Sync<number, Possible<T>>;
    stage?: AnyStage<T, R> | RunPipelineFunction<T, R>;
    overdue?: AnyStage<T, R> | RunPipelineFunction<T, R>;
}
export declare function getTimeoutConfig<T, R>(config: AllowedStage<T, TimeoutConfig<T, R>, R>): TimeoutConfig<T, R>;
export interface IfElseConfig<T, R> extends StageConfig<T, R> {
    condition?: boolean | ValidateFunction<T>;
    success?: AnyStage<T, R> | RunPipelineFunction<T, R>;
    failed?: AnyStage<T, R> | RunPipelineFunction<T, R>;
}
export declare function getIfElseConfig<T, C extends IfElseConfig<T, R>, R>(config: AllowedStage<T, C, R>): C;
export declare type AnyStage<T, R> = Stage<T, StageConfig<T, R>, R> | DoWhile<T, R> | Empty<T, R> | IfElse<T, R> | MultiWaySwitch<T, R> | Parallel<T, R> | Pipeline<T, R> | RetryOnError<T, R> | Sequential<T, R> | Timeout<T, R> | Wrap<T, R>;
//# sourceMappingURL=types.d.ts.map