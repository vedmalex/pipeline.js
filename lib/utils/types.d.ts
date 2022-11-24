import { JSONSchemaType } from 'ajv';
import { Stage } from '../stage';
import { DoWhile } from '../dowhile';
import { Empty } from '../empty';
import { IfElse } from '../ifelse';
import { MultiWaySwitch } from '../multiwayswitch';
import { Parallel } from '../parallel';
import { Pipeline } from '../pipeline';
import { RetryOnError } from '../retryonerror';
import { Sequential } from '../sequential';
import { Timeout } from '../timeout';
import { Wrap } from '../wrap';
export type StageObject = Record<string | symbol | number, any>;
export interface CallbackFunction<T> {
    (): void;
    (err: Possible<Error>): void;
    (err: Possible<Error>, res: T): void;
}
export declare function isCallback<T>(inp?: unknown): inp is CallbackFunction<T>;
export declare function is_async_function(inp?: unknown): boolean;
export declare function is_func1Callbacl<R, P1>(inp?: Function): inp is Func1Sync<R, P1>;
export type Func0Sync<R> = () => R;
export type Func1Sync<R, P1> = (p1: P1) => R;
export type Func2Sync<R, P1, P2> = (p1: P1, p2: P2) => R;
export type Func3Sync<R, P1, P2, P3> = (p1: P1, p2: P2, p3: P3) => R;
export type FuncSync<R, P1 = void, P2 = void, P3 = void> = Func0Sync<R> | Func1Sync<R, P1> | Func2Sync<R, P1, P2> | Func3Sync<R, P1, P2, P3>;
export type Func0Async<R> = Func0Sync<Promise<R>>;
export type Func1Async<R, P1> = Func1Sync<Promise<R>, P1>;
export type Func2Async<R, P1, P2> = Func2Sync<Promise<R>, P1, P2>;
export type Func3Async<R, P1, P2, P3> = Func3Sync<Promise<R>, P1, P2, P3>;
export type FuncAsync<R, P1, P2, P3> = Func0Async<R> | Func1Async<R, P1> | Func2Async<R, P1, P2> | Func3Async<R, P1, P2, P3>;
export type Func0<R> = Func0Sync<R> | Func0Async<R>;
export type Func1<R, P1> = Func1Sync<R, P1> | Func1Async<R, P1>;
export type Func2<R, P1, P2> = Func2Sync<R, P1, P2> | Func2Async<R, P1, P2>;
export type Func3<R, P1, P2, P3> = Func3Sync<R, P1, P2, P3> | Func3Async<R, P1, P2, P3>;
export type Func<R, P1, P2, P3> = FuncSync<R, P1, P2, P3> | FuncAsync<R, P1, P2, P3>;
export declare function is_async<R, P1 = void, P2 = void, P3 = void>(inp?: Function): inp is FuncAsync<R, P1, P2, P3>;
export declare function is_func0<R>(inp?: Function): inp is Func0Sync<R>;
export declare function is_func1<R, P1>(inp?: Function): inp is Func1Sync<R, P1>;
export declare function is_func2<R, P1, P2>(inp?: Function): inp is Func2Sync<R, P1, P2>;
export declare function is_func3<R, P1, P2, P3>(inp?: Function): inp is Func3Sync<R, P1, P2, P3>;
export declare function is_func0_async<T>(inp: Function): inp is Func0Async<T>;
export declare function is_func1_async<R, P1>(inp: Function): inp is Func1Async<R, P1>;
export declare function is_func2_async<R, P1, P2>(inp?: Function): inp is Func2Async<R, P1, P2>;
export declare function is_func3_async<R, P1, P2, P3>(inp?: Function): inp is Func3Async<R, P1, P2, P3>;
export type Thanable<T> = {
    then: Promise<T>['then'];
    catch: Promise<T>['catch'];
};
export declare function is_thenable<T>(inp?: any): inp is Thanable<T>;
export type Possible<T> = T | undefined | null;
export type SingleStageFunction<T extends StageObject> = Func2Async<T, Possible<Error>, Possible<T>> | Func3Sync<void, Possible<Error>, Possible<T>, CallbackFunction<T>>;
export declare function isSingleStageFunction<T extends StageObject>(inp?: any): inp is SingleStageFunction<T>;
export type RunPipelineFunction<T extends StageObject> = Func3Sync<void, Possible<Error>, Possible<T>, CallbackFunction<T>> | Func2Sync<void, Possible<T>, CallbackFunction<T>> | Func2Async<T, Possible<Error>, Possible<T>> | Func0Sync<T | Promise<T> | Thanable<T>> | Func1Async<T, Possible<T>> | Func1Sync<T | Promise<T> | Thanable<T>, Possible<T>> | Func1Sync<void, CallbackFunction<T>> | Func1Sync<void, Possible<T>> | Func0Async<T>;
export declare function isRunPipelineFunction<T extends StageObject>(inp: any): inp is RunPipelineFunction<T>;
export type Rescue<T> = Func1Async<T, Error> | Func1Sync<T | Promise<T> | Thanable<T>, Error> | Func2Async<T, Possible<Error>, Possible<T>> | Func2Sync<T | Promise<T> | Thanable<T>, Error, Possible<T>> | Func3Sync<void, Error, Possible<T>, CallbackFunction<T>>;
export declare function isRescue<T>(inp: any): inp is Rescue<T>;
export interface ValidateFunction<T> {
    (value: T): boolean;
    (value: T): Promise<boolean>;
    (value: T): Thanable<boolean>;
    (value: T, callback: CallbackFunction<boolean>): void;
}
export declare function isValidateFunction<T>(inp: any): inp is ValidateFunction<T>;
export type EnsureFunction<T> = Func1Sync<T | Promise<T> | Thanable<T>, T> | Func1Async<T, T> | Func2Sync<void, T, CallbackFunction<T>>;
export declare function isEnsureFunction<T>(inp: any): inp is EnsureFunction<T>;
export interface StageConfig<T extends StageObject> {
    run?: RunPipelineFunction<T>;
    name?: string;
    rescue?: Rescue<T>;
    schema?: JSONSchemaType<T>;
    ensure?: EnsureFunction<T>;
    validate?: ValidateFunction<T>;
    compile?<C extends StageConfig<T>>(this: Stage<T, C>, rebuild: boolean): StageRun<T>;
    precompile?<C extends StageConfig<T>>(this: C): void;
}
export interface PipelineConfig<T extends StageObject> extends StageConfig<T> {
    stages: Array<AnyStage<T> | RunPipelineFunction<T>>;
}
export interface ParallelConfig<T extends StageObject> extends StageConfig<T> {
    stage: AnyStage<T> | RunPipelineFunction<T>;
    split?: Func1Sync<Array<T>, Possible<T>>;
    combine?: Func2Sync<Possible<T> | void, Possible<T>, Array<any>>;
}
export declare function isStageRun<T extends StageObject>(inp: Function): inp is StageRun<T>;
export type StageRun<T extends StageObject> = (err: Possible<Error>, context: T, callback: CallbackFunction<T>) => void;
export type AllowedStage<T extends StageObject, C extends StageConfig<T>> = string | C | RunPipelineFunction<T> | AnyStage<T>;
export declare function isAllowedStage<T extends StageObject, C extends StageConfig<T>>(inp: any): inp is AllowedStage<T, C>;
export declare function getStageConfig<T extends StageObject, C extends StageConfig<T>>(config: AllowedStage<T, C>): C | AnyStage<T>;
export declare function getNameFrom<T extends StageObject, C extends StageConfig<T>>(config: C): string;
export type AllowedPipeline<T extends StageObject> = AllowedStage<T, PipelineConfig<T>> | Array<RunPipelineFunction<T> | AnyStage<T>>;
export declare function getPipelinConfig<T extends StageObject>(config: AllowedPipeline<T>): PipelineConfig<T>;
export declare function getParallelConfig<T extends StageObject>(config: AllowedStage<T, ParallelConfig<T>>): ParallelConfig<T>;
export declare function getEmptyConfig<T extends StageObject>(config: AllowedStage<T, StageConfig<T>>): AnyStage<T> | StageConfig<T>;
export interface WrapConfig<T extends StageObject> extends StageConfig<T> {
    stage: AnyStage<T> | RunPipelineFunction<T>;
    prepare: (ctx: Possible<T>) => Possible<T>;
    finalize: (ctx: Possible<T>, retCtx: Possible<T>) => Possible<T>;
}
export declare function getWrapConfig<T extends StageObject, C extends WrapConfig<T>>(config: AllowedStage<T, C>): C;
export interface TimeoutConfig<T extends StageObject> extends StageConfig<T> {
    timeout?: number | Func1Sync<number, Possible<T>>;
    stage?: AnyStage<T> | RunPipelineFunction<T>;
    overdue?: AnyStage<T> | RunPipelineFunction<T>;
}
export declare function getTimeoutConfig<T extends StageObject>(config: AllowedStage<T, TimeoutConfig<T>>): TimeoutConfig<T>;
export interface IfElseConfig<T extends StageObject> extends StageConfig<T> {
    condition?: boolean | ValidateFunction<T>;
    success?: AnyStage<T> | RunPipelineFunction<T>;
    failed?: AnyStage<T> | RunPipelineFunction<T>;
}
export declare function getIfElseConfig<T extends StageObject, C extends IfElseConfig<T>>(config: AllowedStage<T, C>): C;
export type AnyStage<T extends StageObject> = Stage<T, StageConfig<T>> | DoWhile<T> | Empty<T> | IfElse<T> | MultiWaySwitch<T> | Parallel<T> | Pipeline<T> | RetryOnError<T> | Sequential<T> | Timeout<T> | Wrap<T>;
//# sourceMappingURL=types.d.ts.map