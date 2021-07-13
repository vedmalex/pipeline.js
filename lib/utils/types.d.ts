import { JSONSchemaType } from 'ajv';
import { Stage } from '../stage';
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
export declare function is_func0_async<R>(inp: Function): inp is Func0Async<R>;
export declare function is_func1_async<R, P1>(inp: Function): inp is Func1Async<R, P1>;
export declare function is_func2_async<R, P1, P2>(inp?: Function): inp is Func2Async<R, P1, P2>;
export declare function is_func3_async<R, P1, P2, P3>(inp?: Function): inp is Func3Async<R, P1, P2, P3>;
export declare type Thanable<T> = {
    then: Promise<T>['then'];
    catch: Promise<T>['catch'];
};
export declare function is_thenable<T>(inp?: any): inp is Thanable<T>;
export declare type CallbackFunction<T> = (err?: Error, res?: T) => void;
export declare type SingleStageFunction<T> = Func2Async<T, Error, T> | Func3Sync<void, Error, T, CallbackFunction<T>>;
export declare function isSingleStageFunction<T>(inp?: any): inp is SingleStageFunction<T>;
export declare type RunPipelineFunction<T = any, R = T> = Func0Async<R | T> | Func0Sync<R | T | Promise<R | T> | Thanable<R | T>> | Func1Async<R | T, T> | Func1Sync<R | T | Promise<R | T> | Thanable<R | T>, T> | Func2Async<R | T, Error, T> | Func2Sync<void, T, CallbackFunction<R | T>> | Func3Sync<void, Error, T, CallbackFunction<T | R>>;
export declare function isRunPipelineFunction<T, R>(inp: any): inp is RunPipelineFunction<T, R>;
export declare type Rescue<T, R> = Func1Async<R | T, Error> | Func1Sync<R | Promise<R> | Thanable<R>, Error> | Func2Async<R | T, Error | undefined, T> | Func2Sync<R | Promise<R> | Thanable<R>, Error, T> | Func3Sync<void, Error, T, CallbackFunction<R | T>>;
export declare function isRescue<T, R>(inp: any): inp is Rescue<T, R>;
export declare type ValidateFunction<T> = Func1Sync<boolean | Promise<boolean> | Thanable<boolean>, T> | Func1Async<boolean, T> | Func2Sync<void, T, CallbackFunction<boolean>>;
export declare function isValidateFunction<T>(inp: any): inp is ValidateFunction<T>;
export declare type EnsureFunction<T> = Func1Sync<T | Promise<T> | Thanable<T>, T> | Func1Async<T, T> | Func2Sync<void, T, CallbackFunction<T>>;
export declare function isEnsureFunction<T>(inp: any): inp is EnsureFunction<T>;
export interface StageConfig<T = any, R = T> {
    run?: RunPipelineFunction<T, R>;
    name?: string;
    rescue?: Rescue<T, R>;
    schema?: JSONSchemaType<T>;
    ensure?: EnsureFunction<T>;
    validate?: ValidateFunction<T>;
    compile?<C extends StageConfig<T, R>>(this: Stage<T, C, R>, rebuild: boolean): StageRun<T, R>;
    precompile?<C extends StageConfig<T, R>>(this: C): void;
}
export interface PipelineConfig<T, R> extends StageConfig<T, R> {
    stages: Array<Stage | RunPipelineFunction>;
}
export interface ParallelConfig<T, R> extends StageConfig<T, R> {
    stage: Stage<T, any, R> | RunPipelineFunction<T, R>;
    split?: Func1Sync<Array<any>, T | R>;
    combine?: Func2Sync<T | R | void, T | R, Array<any>>;
}
export declare type StageRun<T, R> = (err: Error | undefined, context: T, callback: CallbackFunction<T | R>) => void;
export declare type AllowedStage<T = any, C extends StageConfig<T, R> = any, R = T> = string | C | RunPipelineFunction<T, R> | Stage<T, C, R>;
export declare function isAllowedStage<T = any, C extends StageConfig<T, R> = any, R = T>(inp: any): inp is AllowedStage<T, C, R>;
export declare function getStageConfig<T, C extends StageConfig<T, R>, R>(config: AllowedStage<T, C, R>): C | Stage;
export declare function getNameFrom<C extends StageConfig>(config: C): string;
export declare type AllowedPipeline<T, C extends PipelineConfig<T, R>, R> = AllowedStage<T, C, R> | Array<RunPipelineFunction<T, R> | Stage<T, C, R>>;
export declare function getPipelinConfig<T, C extends PipelineConfig<T, R>, R>(config: AllowedPipeline<T, C, R>): C;
export declare function getParallelConfig<T, C extends ParallelConfig<T, R>, R>(config: AllowedStage<T, C, R>): C;
export declare function getEmptyConfig<T, C extends StageConfig<T, R>, R>(config: AllowedStage<T, StageConfig<T, R>, R>): Stage<T, C, R> | StageConfig<T, R>;
export interface WrapConfig<T, R> extends StageConfig<T, R> {
    stage: Stage<T, any, R> | RunPipelineFunction<T, R>;
    prepare: Function;
    finalize: Function;
}
export declare function getWrapConfig<T, C extends WrapConfig<T, R>, R>(config: AllowedStage<T, C, R>): C;
export interface TimeoutConfig<T, R> extends StageConfig<T, R> {
    timeout?: number | Func1Sync<number, T | R>;
    stage?: Stage<T, any, R> | RunPipelineFunction<T, R>;
    overdue?: Stage<T, any, R> | RunPipelineFunction<T, R>;
}
export declare function getTimeoutConfig<T, C extends TimeoutConfig<T, R>, R>(config: AllowedStage<T, C, R>): C;
export interface IfElseConfig<T, R> extends StageConfig<T, R> {
    condition?: boolean | ValidateFunction<T | R>;
    success?: Stage<T, any, R> | RunPipelineFunction<T, R>;
    failed?: Stage<T, any, R> | RunPipelineFunction<T, R>;
}
export declare function getIfElseConfig<T, C extends IfElseConfig<T, R>, R>(config: AllowedStage<T, C, R>): C;
//# sourceMappingURL=types.d.ts.map