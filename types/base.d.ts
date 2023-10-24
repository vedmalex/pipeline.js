import z from 'zod';
import { GetStage } from './builder';
import { InferBuilderParams, IntellisenseFor, Merge, OverwriteIfDefined, StageType, UnsetMarker } from './utility';
export type BaseStageConfig<Input, Output> = {
    input?: z.ZodType<Input>;
    output?: z.ZodType<Output>;
};
export type FnRun<Input, Output> = (payload: {
    input: Input;
}) => Promise<Output> | Output;
export type RunDef<Fn extends FnRun<any, any>> = Fn extends FnRun<infer Input, infer Output> ? {
    _input: Input;
    _output: Output;
} : {
    _input: UnsetMarker;
    _output: UnsetMarker;
};
export type RunConfig<Input, Output> = {
    run: FnRun<Input, Output>;
};
export declare const validatorBaseStageConfig: z.ZodObject<{
    input: z.ZodOptional<z.ZodType<z.ZodType<unknown, z.ZodTypeDef, unknown>, z.ZodTypeDef, z.ZodType<unknown, z.ZodTypeDef, unknown>>>;
    output: z.ZodOptional<z.ZodType<z.ZodType<unknown, z.ZodTypeDef, unknown>, z.ZodTypeDef, z.ZodType<unknown, z.ZodTypeDef, unknown>>>;
}, "strip", z.ZodTypeAny, {
    input?: z.ZodType<unknown, z.ZodTypeDef, unknown> | undefined;
    output?: z.ZodType<unknown, z.ZodTypeDef, unknown> | undefined;
}, {
    input?: z.ZodType<unknown, z.ZodTypeDef, unknown> | undefined;
    output?: z.ZodType<unknown, z.ZodTypeDef, unknown> | undefined;
}>;
export declare function validatorRun<Input, Output>(_input?: z.ZodSchema, _output?: z.ZodSchema): z.ZodFunction<z.ZodTuple<[z.ZodObject<{
    input: z.ZodType<any, z.ZodTypeDef, any>;
}, "strip", z.ZodTypeAny, {
    input?: any;
}, {
    input?: any;
}>], null>, z.ZodUnion<[z.ZodPromise<z.ZodType<any, z.ZodTypeDef, any>>, z.ZodType<any, z.ZodTypeDef, any>]>>;
export declare function validatorRunConfig<Input, Output>(config?: BaseStageConfig<Input, Output>): z.ZodObject<{
    run: z.ZodFunction<z.ZodTuple<[z.ZodObject<{
        input: z.ZodType<any, z.ZodTypeDef, any>;
    }, "strip", z.ZodTypeAny, {
        input?: any;
    }, {
        input?: any;
    }>], null>, z.ZodUnion<[z.ZodPromise<z.ZodType<any, z.ZodTypeDef, any>>, z.ZodType<any, z.ZodTypeDef, any>]>>;
}, "strip", z.ZodTypeAny, {
    run: (args_0: {
        input?: any;
    }) => any;
}, {
    run: (args_0: {
        input?: any;
    }) => any;
}>;
export declare class AbstractStage<Input, Output, TConfig extends BaseStageConfig<Input, Output> = BaseStageConfig<Input, Output>> {
    private _config;
    get config(): TConfig;
    protected set config(config: TConfig);
    protected get run(): FnRun<Input, Output>;
    protected set run(run: FnRun<Input, Output>);
    constructor(config: BaseStageConfig<Input, Output> & RunConfig<Input, Output>);
    exec({ input }: {
        input: Input;
    }): Promise<Output>;
    execute(input: Input): Promise<Output>;
    protected validate<T>(validate: z.ZodType<T>, context: unknown): Promise<import("./CallbackFunction").CallbackArgs<unknown, T>>;
}
export interface BuilderParams {
    _type: unknown;
}
export interface WithInputParams {
    _input: unknown;
}
export interface WithInputOutputParams extends WithInputParams {
    _output: unknown;
}
export interface WithStageParams {
    _stage: unknown;
}
export interface StageParams extends BuilderParams, WithInputOutputParams {
    _run: unknown;
}
export interface RescueParams extends BuilderParams, WithInputOutputParams, WithStageParams {
}
export interface WrapParams extends BuilderParams, WithInputOutputParams, WithStageParams {
    _prepare: unknown;
    _finalize: unknown;
}
export interface TimeoutParams extends BuilderParams, WithInputOutputParams, WithStageParams {
    _timeout: unknown;
}
export interface IfElseParams extends BuilderParams, WithInputOutputParams, WithStageParams {
    _if: unknown;
    _then: unknown;
    _else: unknown;
}
export interface RetryOnErrorParams extends BuilderParams, WithInputOutputParams, WithStageParams {
    _retry: unknown;
    _backup: unknown;
    _restore: unknown;
    _storage: unknown;
}
export interface DoWhileParams extends BuilderParams, WithInputOutputParams, WithStageParams {
    _step: unknown;
    _combine: unknown;
}
export interface MultiWaySwitchParams extends BuilderParams, WithInputOutputParams {
    _cases: unknown;
}
export interface MultiWaySwitchCaseParams extends BuilderParams, WithInputOutputParams, WithStageParams {
    _evaluate: unknown;
}
export interface Params extends BuilderParams, WithInputOutputParams, WithStageParams {
    _prepare: unknown;
    _finalize: unknown;
}
export interface PipelineParams extends BuilderParams, WithInputOutputParams {
}
export interface SequentialParams extends BuilderParams, WithInputOutputParams, WithStageParams {
    _serial: unknown;
}
export interface Builder<TParams extends BuilderParams> {
    type<T extends StageType>(type: T): IntellisenseFor<T, 'start', GetStage<T, Merge<InferBuilderParams<TParams>, {
        _type: OverwriteIfDefined<TParams['_type'], T>;
    }>>>;
}
