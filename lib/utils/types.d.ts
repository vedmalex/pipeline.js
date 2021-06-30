import { JSONSchemaType } from 'ajv';
export interface IStage<T = any, C extends StageConfig<T, R> = any, R = T> {
    get name(): string;
    get reportName(): string;
    toString(): string;
    execute(context: T): Promise<R | T>;
    execute(context: T, callback: CallbackFunction<R | T>): void;
    execute(err: Error | undefined, context: T, callback: CallbackFunction<R | T>): void;
    compile(rebuild?: boolean): void;
    get config(): C;
}
export declare function isIStage<T, C, R>(inp: any): inp is IStage<T, C, R>;
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
export declare function is_async<R, P1 = void, P2 = void, P3 = void>(inp: Function): inp is FuncAsync<R, P1, P2, P3>;
export declare function is_func0<R>(inp: Function): inp is Func0Sync<R>;
export declare function is_func1<R, P1>(inp: Function): inp is Func1Sync<R, P1>;
export declare function is_func2<R, P1, P2>(inp: Function): inp is Func2Sync<R, P1, P2>;
export declare function is_func3<R, P1, P2, P3>(inp: Function): inp is Func3Sync<R, P1, P2, P3>;
export declare function is_func0_async<R>(inp: Function): inp is Func0Async<R>;
export declare function is_func1_async<R, P1>(inp: Function): inp is Func1Async<R, P1>;
export declare function is_func2_async<R, P1, P2>(inp: Function): inp is Func2Async<R, P1, P2>;
export declare function is_func3_async<R, P1, P2, P3>(inp: Function): inp is Func3Async<R, P1, P2, P3>;
export declare type Thanable<T> = {
    then: Promise<T>['then'];
    catch: Promise<T>['catch'];
};
export declare function is_thenable<T>(inp: any): inp is Thanable<T>;
export declare type CallbackFunction<T> = (err?: Error, res?: T) => void;
export declare type SingleStageFunction<T> = Func2Async<T, Error, T> | Func3Sync<void, Error, T, CallbackFunction<T>>;
export declare type RunPipelineFunction<T, R> = Func0Async<R | T> | Func0Sync<R | T | Promise<R | T> | Thanable<R | T>> | Func1Async<R | T, T> | Func1Sync<R | T | Promise<R | T> | Thanable<R | T>, T> | Func2Async<R | T, Error, T> | Func2Sync<void, T, CallbackFunction<R | T>> | Func3Sync<void, Error, T, CallbackFunction<T | R>>;
export declare type Rescue<T, R> = Func1Async<R | T, Error> | Func1Sync<R | Promise<R> | Thanable<R>, Error> | Func2Async<R | T, Error | undefined, T> | Func2Sync<R | Promise<R> | Thanable<R>, Error, T> | Func3Sync<void, Error, T, CallbackFunction<R | T>>;
export declare type ValidateFunction<T> = Func1Sync<boolean | Promise<boolean> | Thanable<boolean>, T> | Func1Async<boolean, T> | Func2Sync<void, T, CallbackFunction<boolean>>;
export declare type EnsureFunction<T> = Func1Sync<T | Promise<T> | Thanable<T>, T> | Func1Async<T, T> | Func2Sync<void, T, CallbackFunction<T>>;
export interface StageConfig<T = any, R = T> {
    run?: RunPipelineFunction<T, R>;
    name?: string;
    rescue?: Rescue<T, R>;
    schema?: JSONSchemaType<T>;
    ensure?: EnsureFunction<T>;
    validate?: ValidateFunction<T>;
    compile?<C extends StageConfig<T, R>>(this: IStage<T, C, R>, rebuild: boolean): StageRun<T, R>;
    precompile?<C extends StageConfig<T, R>>(this: C): void;
}
export interface PipelineConfig<T, R> extends StageConfig<T, R> {
    stages: Array<IStage<any, any, any>>;
}
export interface ParallelConfig<T, R> extends StageConfig<T, R> {
    stage: IStage<T, any, R> | RunPipelineFunction<T, R>;
    split?: Func1Sync<Array<any>, T | R>;
    combine?: Func2Sync<T | R | void, T | R, Array<any>>;
}
export declare type StageRun<T, R> = (err: Error | undefined, context: T, callback: CallbackFunction<T | R>) => void;
//# sourceMappingURL=types.d.ts.map