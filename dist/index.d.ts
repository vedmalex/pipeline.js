import { JSONSchemaType } from "ajv";
declare function CreateError(err: string | Error | ComplexError | null | undefined | (string | Error | ComplexError | null | undefined)[]): Possible<ComplexError>;
declare function isComplexError(inp: any): inp is ComplexError;
declare class ComplexError extends Error {
    payload: Array<Error>;
    isComplex: boolean;
    constructor(...payload: Array<Error>);
}
declare const StageSymbol: unique symbol;
declare function isStage<T extends StageObject, C extends StageConfig<T> = StageConfig<T>>(obj: any): obj is Stage<T, C>;
declare class Stage<T extends StageObject, C extends StageConfig<T> = StageConfig<T>> {
    get config(): C;
    [StageSymbol]: boolean;
    protected _config: C;
    constructor();
    constructor(name: string);
    constructor(config: C);
    constructor(runFn: RunPipelineFunction<T>);
    constructor(stage: AnyStage<T>);
    get reportName(): string;
    get name(): string;
    protected runStageMethod(err_: Possible<ComplexError>, err: Possible<ComplexError>, ctx: ContextType<T>, context: ContextType<T>, stageToRun: InternalStageRun<T>, callback: CallbackFunction<T>): void;
    execute(context: T): Promise<T>;
    execute(context: ContextType<T>): Promise<T>;
    execute(context: T, callback: CallbackExternalFunction<T>): void;
    execute(context: ContextType<T>, callback: CallbackExternalFunction<T>): void;
    execute(err: Possible<ComplexError>, context: T, callback: CallbackExternalFunction<T>): void;
    protected stage(err: Possible<ComplexError>, context: ContextType<T>, callback: CallbackFunction<T>): void;
    compile(rebuild?: boolean): StageRun<T>;
    protected run?: InternalStageRun<T>;
    protected rescue<E>(_err: Possible<Error | string>, context: ContextType<T>, fail: (err: Possible<ComplexError>) => void, success: (ctx: ContextType<T>) => void): void;
    toString(): string;
    protected validate(validate: ValidateFunction<T>, context: ContextType<T>, callback: CallbackFunction<T>): void;
    protected ensure(ensure: EnsureFunction<T>, context: ContextType<T>, callback: CallbackFunction<T>): void;
}
type EnsureParams<T> = {
    context: ContextType<T>;
    callback: CallbackFunction<T> | undefined;
    err: Possible<ComplexError>;
    is_promise: boolean;
};
interface DoWhileConfig<T extends StageObject, R extends StageObject> extends StageConfig<T> {
    stage: AnyStage<T, R> | SingleStageFunction<T>;
    split?: Func2Sync<T, Possible<T>, number>;
    reachEnd?: Func3Sync<boolean, Possible<ComplexError>, Possible<T>, number>;
}
declare class DoWhile<T extends StageObject, R extends StageObject> extends Stage<T, DoWhileConfig<T, R>> {
    constructor();
    constructor(stage: Stage<T, StageConfig<T>>);
    constructor(config: DoWhileConfig<T, R>);
    constructor(stageFn: SingleStageFunction<T>);
    get reportName(): string;
    toString(): string;
    reachEnd(err: Possible<ComplexError>, ctx: Possible<T>, iter: number): boolean;
    split(ctx: Possible<T>, iter: number): any;
    compile(rebuild?: boolean): StageRun<any>;
}
declare class Empty<T extends StageObject> extends Stage<T, StageConfig<T>> {
    constructor(config: AllowedStage<T, T, StageConfig<T>>);
    toString(): string;
}
declare class IfElse<T extends StageObject> extends Stage<T, IfElseConfig<T>> {
    constructor(config?: AllowedStage<T, T, IfElseConfig<T>>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T>;
}
type MultiWaySwitchCase<R extends StageObject, I extends StageObject> = MultiWaySwitchStatic<R, I> | MultiWaySwitchDynamic<R, I>;
interface MultiWaySwitchStatic<R extends StageObject, I extends StageObject> {
    stage: AnyStage<I, I> | RunPipelineFunction<I>;
    evaluate?: boolean;
    split?: Func1Sync<ContextType<R>, ContextType<I>>;
    combine?: Func2Sync<ContextType<I>, ContextType<R>, any>;
}
interface MultiWaySwitchDynamic<T extends StageObject, R extends StageObject> {
    stage: AnyStage<R, R> | RunPipelineFunction<R>;
    evaluate: Func1<boolean, R>;
    split?: Func1Sync<ContextType<T>, ContextType<R>>;
    combine?: Func2Sync<ContextType<R>, ContextType<R>, any>;
}
declare function isMultiWaySwitch<T extends StageObject, R extends StageObject>(inp: object): inp is MultiWaySwitchCase<T, R>;
interface MultWaySwitchConfig<T extends StageObject, R extends StageObject> extends StageConfig<T> {
    cases: Array<MultiWaySwitchCase<R, StageObject>>;
    split?: Func1Sync<ContextType<R>, ContextType<StageObject>>;
    combine?: Func2Sync<ContextType<T>, Possible<T>, any>;
}
type AllowedMWS<T extends StageObject, R extends StageObject, C extends StageConfig<T>> = AllowedStage<T, R, C> | Array<Stage<T, C> | RunPipelineFunction<T> | MultiWaySwitchCase<T, R>>;
declare function getMultWaySwitchConfig<T extends StageObject, R extends StageObject>(config: AllowedMWS<T, R, Partial<MultWaySwitchConfig<T, R>>>): MultWaySwitchConfig<T, R>;
declare class MultiWaySwitch<T extends StageObject, R extends StageObject> extends Stage<T, MultWaySwitchConfig<T, R>> {
    constructor(config?: AllowedStage<T, R, MultWaySwitchConfig<T, R>>);
    get reportName(): string;
    toString(): string;
    combine(ctx: ContextType<T>, retCtx: ContextType<R>): ContextType<T>;
    combineCase(item: MultiWaySwitchCase<R, StageObject>, ctx: ContextType<R>, retCtx: ContextType<StageObject>): ContextType<T>;
    split(ctx: ContextType<T>): ContextType<R>;
    splitCase(item: {
        split?: Func1Sync<any, ContextType<T>>;
    }, ctx: ContextType<R>): any;
    compile(rebuild?: boolean): StageRun<T>;
}
declare class Parallel<T extends StageObject, R extends StageObject> extends Stage<T, ParallelConfig<T, R>> {
    constructor(config?: AllowedStage<T, R, ParallelConfig<T, R>>);
    split(ctx: ContextType<T>): Array<ContextType<R>>;
    combine(ctx: ContextType<T>, children: Array<ContextType<R>>): ContextType<T>;
    get reportName(): string;
    toString(): string;
    get name(): string;
    compile(rebuild?: boolean): StageRun<T>;
}
type ParallelErrorInput = {
    stage?: string;
    index: number;
    err: Error;
    ctx: any;
};
declare class ParallelError<T> extends Error {
    name: string;
    stage?: string;
    index: number;
    err: Error;
    ctx: T;
    constructor(init: ParallelErrorInput);
    toString(): string;
}
declare class Pipeline<T extends StageObject> extends Stage<T, PipelineConfig<T>> {
    constructor(config?: PipelineConfig<T> | AllowedStage<T, T, PipelineConfig<T>> | Array<Stage<T, PipelineConfig<T>> | RunPipelineFunction<T>>);
    get reportName(): string;
    addStage<IT extends StageObject>(_stage: StageConfig<IT> | RunPipelineFunction<IT> | AnyStage<IT>): void;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T>;
}
interface RetryOnErrorConfig<T extends StageObject> extends StageConfig<T> {
    stage: AnyStage<T> | RunPipelineFunction<T>;
    retry: number | Func3<boolean, Possible<ComplexError>, ContextType<T>, number>;
    backup?: (ctx: ContextType<T>) => ContextType<T>;
    restore?: (ctx: ContextType<T>, backup: ContextType<T>) => ContextType<T>;
}
declare function getRetryOnErrorConfig<T extends StageObject, C extends RetryOnErrorConfig<T>>(config: AllowedStage<T, T, C>): C;
declare class RetryOnError<T extends StageObject> extends Stage<T, RetryOnErrorConfig<T>> {
    constructor(config?: AllowedStage<T, T, RetryOnErrorConfig<T>>);
    get reportName(): string;
    toString(): string;
    backupContext(ctx: ContextType<T>): ContextType<T>;
    restoreContext(ctx: ContextType<T>, backup: ContextType<T>): ContextType<T>;
    compile(rebuild?: boolean): StageRun<T>;
}
declare class Sequential<T extends StageObject, R extends StageObject> extends Stage<T, ParallelConfig<T, R>> {
    constructor(config?: AllowedStage<T, R, ParallelConfig<T, R>>);
    split(ctx: ContextType<T>): Array<ContextType<R>>;
    combine(ctx: ContextType<T>, children: Array<ContextType<R>>): ContextType<T>;
    get reportName(): string;
    toString(): string;
    get name(): string;
    compile(rebuild?: boolean): StageRun<T>;
}
declare class Timeout<T extends StageObject> extends Stage<T, TimeoutConfig<T>> {
    constructor(config?: AllowedStage<T, T, TimeoutConfig<T>>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T>;
}
declare class Wrap<T extends StageObject, R extends StageObject> extends Stage<T, WrapConfig<T, R>> {
    constructor(config?: AllowedStage<T, R, WrapConfig<T, R>>);
    get reportName(): string;
    toString(): string;
    compile(rebuild?: boolean): StageRun<T>;
    prepare(ctx: ContextType<T>): unknown;
    finalize(ctx: ContextType<T>, retCtx: ContextType<R>): ContextType<T>;
}
type StageObject = Record<string | symbol | number, any>;
type CallbackFunction<T> = (() => void) | ((err?: Possible<ComplexError>) => void) | ((err?: Possible<ComplexError>, res?: ContextType<T>) => void);
type CallbackExternalFunction<T> = (() => void) | ((err?: Possible<Error>) => void) | ((err?: Possible<Error>, res?: T) => void);
declare function isCallback<T>(inp?: unknown): inp is CallbackFunction<T>;
declare function isExternalCallback<T>(inp?: unknown): inp is CallbackExternalFunction<T>;
declare function is_async_function(inp?: unknown): boolean;
declare function is_func1Callbacl<R, P1>(inp?: Function): inp is Func1Sync<R, P1>;
type Func0Sync<R> = () => R;
type Func1Sync<R, P1> = (p1: P1) => R;
type Func2Sync<R, P1, P2> = (p1: P1, p2: P2) => R;
type Func3Sync<R, P1, P2, P3> = (p1: P1, p2: P2, p3: P3) => R;
type FuncSync<R, P1 = void, P2 = void, P3 = void> = Func0Sync<R> | Func1Sync<R, P1> | Func2Sync<R, P1, P2> | Func3Sync<R, P1, P2, P3>;
type Func0Async<R> = Func0Sync<Promise<R>>;
type Func1Async<R, P1> = Func1Sync<Promise<R>, P1>;
type Func2Async<R, P1, P2> = Func2Sync<Promise<R>, P1, P2>;
type Func3Async<R, P1, P2, P3> = Func3Sync<Promise<R>, P1, P2, P3>;
type FuncAsync<R, P1, P2, P3> = Func0Async<R> | Func1Async<R, P1> | Func2Async<R, P1, P2> | Func3Async<R, P1, P2, P3>;
type Func0<R> = Func0Sync<R> | Func0Async<R>;
type Func1<R, P1> = Func1Sync<R, P1> | Func1Async<R, P1>;
type Func2<R, P1, P2> = Func2Sync<R, P1, P2> | Func2Async<R, P1, P2>;
type Func3<R, P1, P2, P3> = Func3Sync<R, P1, P2, P3> | Func3Async<R, P1, P2, P3>;
type Func<R, P1, P2, P3> = FuncSync<R, P1, P2, P3> | FuncAsync<R, P1, P2, P3>;
declare function is_async<R, P1 = void, P2 = void, P3 = void>(inp?: Function): inp is FuncAsync<R, P1, P2, P3>;
declare function is_func0<R>(inp?: Function): inp is Func0Sync<R>;
declare function is_func1<R, P1>(inp?: Function): inp is Func1Sync<R, P1>;
declare function is_func2<R, P1, P2>(inp?: Function): inp is Func2Sync<R, P1, P2>;
declare function is_func3<R, P1, P2, P3>(inp?: Function): inp is Func3Sync<R, P1, P2, P3>;
declare function is_func0_async<T>(inp: Function): inp is Func0Async<ContextType<T>>;
declare function is_func1_async<R, P1>(inp: Function): inp is Func1Async<R, P1>;
declare function is_func2_async<R, P1, P2>(inp?: Function): inp is Func2Async<R, P1, P2>;
declare function is_func3_async<R, P1, P2, P3>(inp?: Function): inp is Func3Async<R, P1, P2, P3>;
type Thanable<T> = {
    then: Promise<T>["then"];
    catch: Promise<T>["catch"];
};
declare function is_thenable<T>(inp?: any): inp is Thanable<T>;
type Possible<T> = T | undefined | null;
type SingleStageFunction<T extends StageObject> = Func2Async<T, Possible<ComplexError>, Possible<T>> | Func3Sync<void, Possible<ComplexError>, Possible<T>, CallbackExternalFunction<T>>;
declare function isSingleStageFunction<T extends StageObject>(inp?: any): inp is SingleStageFunction<T>;
type RunPipelineFunction<T extends StageObject> = Func3Sync<void, Possible<ComplexError>, ContextType<T>, CallbackExternalFunction<T>> | Func2Sync<void, ContextType<T>, CallbackExternalFunction<T>> | Func2Async<ContextType<T>, Possible<ComplexError>, ContextType<T>> | Func0Sync<ContextType<T> | Promise<ContextType<T>> | Thanable<ContextType<T>>> | Func1Async<ContextType<T>, ContextType<T>> | Func1Sync<ContextType<T> | Promise<ContextType<T>> | Thanable<ContextType<T>>, ContextType<T>> | Func1Sync<void, CallbackExternalFunction<T>> | Func1Sync<void, ContextType<T>> | Func0Async<ContextType<T>>;
declare function isRunPipelineFunction<T extends StageObject>(inp: any): inp is RunPipelineFunction<T>;
type Rescue<T> = Func1Async<T, Error> | Func1Sync<T | Promise<T> | Thanable<T>, Error> | Func2Async<T, Possible<ComplexError>, Possible<T>> | Func2Sync<T | Promise<T> | Thanable<T>, Error, Possible<T>> | Func3Sync<void, Error, Possible<T>, CallbackFunction<T>>;
declare function isRescue<T>(inp: any): inp is Rescue<T>;
type ValidateFunction<T> = (() => boolean) | ((value: ContextType<T>) => boolean) | ((value: ContextType<T>) => Promise<boolean>) | ((value: ContextType<T>) => Thanable<boolean>) | ((value: ContextType<T>, callback: CallbackExternalFunction<boolean>) => void);
declare function isValidateFunction<T>(inp: any): inp is ValidateFunction<T>;
type EnsureFunction<T> = Func1Sync<T | Promise<T> | Thanable<T>, T> | Func1Async<T, T> | Func2Sync<void, T, CallbackFunction<T>>;
declare function isEnsureFunction<T>(inp: any): inp is EnsureFunction<T>;
interface StageConfig<T extends StageObject> {
    run?: RunPipelineFunction<T>;
    name?: string;
    rescue?: Rescue<T>;
    schema?: JSONSchemaType<T>;
    ensure?: EnsureFunction<T>;
    validate?: ValidateFunction<T>;
    compile?<C extends StageConfig<T>>(this: Stage<T, C>, rebuild: boolean): StageRun<T>;
    precompile?<C extends StageConfig<T>>(this: C): void;
}
interface PipelineConfig<T extends StageObject> extends StageConfig<T> {
    stages: Array<AnyStage<T, T> | RunPipelineFunction<T>>;
}
interface ParallelConfig<T extends StageObject, R extends StageObject> extends StageConfig<T> {
    stage: AnyStage<R> | RunPipelineFunction<R>;
    split?: Func1Sync<Array<ContextType<R>>, ContextType<T>>;
    combine?: Func2Sync<ContextType<T> | void, ContextType<T>, Array<ContextType<R>>>;
}
declare function isStageRun<T extends StageObject>(inp: Function): inp is StageRun<T>;
type StageRun<T extends StageObject> = (err: Possible<ComplexError>, context: ContextType<T>, callback: CallbackFunction<T>) => void;
type InternalStageRun<T extends StageObject> = (err: Possible<ComplexError>, context: ContextType<T>, callback: CallbackFunction<T>) => void;
type AllowedStage<T extends StageObject, R extends StageObject, C extends StageConfig<T>> = string | C | RunPipelineFunction<T> | AnyStage<T>;
declare function isAllowedStage<T extends StageObject, R extends StageObject, C extends StageConfig<T>>(inp: any): inp is AllowedStage<T, R, C>;
declare function getStageConfig<T extends StageObject, R extends StageObject, C extends StageConfig<T>>(config: AllowedStage<T, R, C>): C | AnyStage<T, R>;
declare function getNameFrom<T extends StageObject, C extends StageConfig<T>>(config: C): string;
type AllowedPipeline<T extends StageObject, R extends StageObject> = AllowedStage<T, R, PipelineConfig<T>> | Array<RunPipelineFunction<T> | AnyStage<T>>;
declare function getPipelinConfig<T extends StageObject, R extends StageObject>(config: AllowedPipeline<T, R>): PipelineConfig<T>;
declare function getParallelConfig<T extends StageObject, R extends StageObject>(config: AllowedStage<T, R, ParallelConfig<T, R>>): ParallelConfig<T, R>;
declare function getEmptyConfig<T extends StageObject, R extends StageObject>(config: AllowedStage<T, R, StageConfig<T>>): AnyStage<T> | StageConfig<T>;
interface WrapConfig<T extends StageObject, R extends StageObject> extends StageConfig<T> {
    stage: AnyStage<T> | RunPipelineFunction<T>;
    prepare: (ctx: ContextType<T>) => ContextType<R>;
    finalize?: (ctx: ContextType<T>, retCtx: ContextType<R>) => ContextType<T>;
}
declare function getWrapConfig<T extends StageObject, R extends StageObject, C extends WrapConfig<T, R>>(config: AllowedStage<T, R, C>): C;
interface TimeoutConfig<T extends StageObject> extends StageConfig<T> {
    timeout?: number | Func1Sync<number, Possible<T>>;
    stage?: AnyStage<T> | RunPipelineFunction<T>;
    overdue?: AnyStage<T> | RunPipelineFunction<T>;
}
declare function getTimeoutConfig<T extends StageObject>(config: AllowedStage<T, T, TimeoutConfig<T>>): TimeoutConfig<T>;
interface IfElseConfig<T extends StageObject> extends StageConfig<T> {
    condition?: boolean | ValidateFunction<T>;
    success?: AnyStage<T> | RunPipelineFunction<T>;
    failed?: AnyStage<T> | RunPipelineFunction<T>;
}
declare function getIfElseConfig<T extends StageObject, C extends IfElseConfig<T>>(config: AllowedStage<T, T, C>): C;
type AnyStage<T extends StageObject, R extends StageObject = T> = Stage<T, StageConfig<T>> | DoWhile<T, R> | Empty<T> | IfElse<T> | MultiWaySwitch<T, R> | Parallel<T, R> | Pipeline<T> | RetryOnError<T> | Sequential<T, R> | Timeout<T> | Wrap<T, R>;
declare function isAnyStage<T extends StageObject, R extends StageObject = T>(obj: any): obj is AnyStage<T, R>;
declare const ContextSymbol: unique symbol;
declare const OriginalObject: unique symbol;
declare const ProxySymbol: unique symbol;
declare enum RESERVATIONS {
    prop = 0,
    func_this = 1,
    func_ctx = 2
}
type ContextType<T> = IContextProxy<T> & T;
interface IContextProxy<T> {
    getParent(): ContextType<T>;
    getRoot(): ContextType<T>;
    setParent(parent: ContextType<T>): void;
    setRoot(parent: ContextType<T>): void;
    toJSON(): string;
    toObject(clean?: boolean): T;
    toString(): string;
    fork<C extends StageObject>(config: C): ContextType<T & C>;
    get(path: keyof T): any;
    get original(): T;
    [key: string | symbol | number]: any;
}
declare class Context<T extends StageObject> implements IContextProxy<T> {
    static ensure<T extends StageObject>(_config?: Partial<T>): ContextType<T>;
    static isContext<T extends StageObject>(obj?: any): obj is IContextProxy<T>;
    protected ctx: T;
    protected proxy: any;
    protected __parent: ContextType<T>;
    protected __root: ContextType<T>;
    protected __stack?: string[];
    protected id: number;
    [OriginalObject]?: boolean;
    get original(): T;
    constructor(config: T);
    fork<C extends StageObject>(ctx: C): ContextType<T & C>;
    addChild<C extends StageObject>(child: ContextType<C>): ContextType<C>;
    get(path: keyof T): any;
    addSubtree<C extends StageObject>(lctx: ContextType<C>): ContextType<C>;
    getParent(): ContextType<T>;
    getRoot(): ContextType<T>;
    setParent(parent: ContextType<T>): void;
    setRoot(root: ContextType<T>): void;
    hasChild<C extends StageObject>(ctx: ContextType<C>): boolean;
    hasSubtree<C extends StageObject>(ctx: ContextType<C>): boolean;
    toObject<T>(): T;
    toJSON(): string;
    toString(): string;
}
export { ContextSymbol, OriginalObject, ProxySymbol, RESERVATIONS, ContextType, IContextProxy, Context, StageSymbol, isStage, Stage, EnsureParams, DoWhileConfig, DoWhile, Empty, IfElse, MultiWaySwitchCase, MultiWaySwitchStatic, MultiWaySwitchDynamic, isMultiWaySwitch, MultWaySwitchConfig, AllowedMWS, getMultWaySwitchConfig, MultiWaySwitch, Parallel, ParallelErrorInput, ParallelError, Pipeline, RetryOnErrorConfig, getRetryOnErrorConfig, RetryOnError, Sequential, Timeout, CreateError, isComplexError, ComplexError, StageObject, CallbackFunction, CallbackExternalFunction, isCallback, isExternalCallback, is_async_function, is_func1Callbacl, Func0Sync, Func1Sync, Func2Sync, Func3Sync, FuncSync, Func0Async, Func1Async, Func2Async, Func3Async, FuncAsync, Func0, Func1, Func2, Func3, Func, is_async, is_func0, is_func1, is_func2, is_func3, is_func0_async, is_func1_async, is_func2_async, is_func3_async, Thanable, is_thenable, Possible, SingleStageFunction, isSingleStageFunction, RunPipelineFunction, isRunPipelineFunction, Rescue, isRescue, ValidateFunction, isValidateFunction, EnsureFunction, isEnsureFunction, StageConfig, PipelineConfig, ParallelConfig, isStageRun, StageRun, InternalStageRun, AllowedStage, isAllowedStage, getStageConfig, getNameFrom, AllowedPipeline, getPipelinConfig, getParallelConfig, getEmptyConfig, WrapConfig, getWrapConfig, TimeoutConfig, getTimeoutConfig, IfElseConfig, getIfElseConfig, AnyStage, isAnyStage, Wrap };
//# sourceMappingURL=index.d.ts.map