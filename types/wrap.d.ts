import { AbstractStage, WrapParams } from './base';
import { StageConfig } from './stage';
import { ErrorMessage, ExtractInput, ExtractOutput, ExtractStage, ExtractStageInput, ExtractStageOutput, inferParser, InferWrapParams, IntellisenseFor, Merge, OverwriteIfDefined, Parser, SchemaType } from './utility';
export declare class Wrap<Input, Output, IInput, IOutput, Config extends WrapConfig<Input, Output, IInput, IOutput> = WrapConfig<Input, Output, IInput, IOutput>> extends AbstractStage<Input, Output, Config> {
    constructor(cfg: Config);
}
export type WrapPrepare<Input, IInput> = (payload: {
    input: Input;
}) => Promise<IInput> | IInput;
export type WrapFinalize<Input, Output, IOutput> = (payload: {
    input: Input;
    data: IOutput;
}) => Promise<Output> | Output;
export interface WrapConfig<Input, Output, IInput, IOutput> extends StageConfig<Input, Output> {
    stage: AbstractStage<IInput, IOutput>;
    prepare: WrapPrepare<Input, IInput>;
    finalize: WrapFinalize<Input, Output, IOutput>;
}
export interface WrapBuilder<TParams extends WrapParams> {
    _def: WrapConfig<ExtractInput<TParams>, ExtractOutput<TParams>, any, any>;
    build<Result extends Wrap<ExtractInput<TParams>, ExtractOutput<TParams>, ExtractStageInput<TParams['_stage']>, ExtractStageOutput<TParams['_stage']>>>(): TParams['_prepare'] extends true ? TParams['_finalize'] extends true ? Result : ErrorMessage<'prepare MUST have finalize'> : Result;
    input<$Parser extends Parser>(schema: SchemaType<TParams, $Parser, '_input', 'in'>): IntellisenseFor<'wrap', 'input', WrapBuilder<Merge<InferWrapParams<TParams>, {
        _input: OverwriteIfDefined<TParams['_input'], inferParser<$Parser>['in']>;
    }>>>;
    output<$Parser extends Parser>(schema: SchemaType<TParams, $Parser, '_output', 'out'>): IntellisenseFor<'wrap', 'output', WrapBuilder<Merge<InferWrapParams<TParams>, {
        _output: OverwriteIfDefined<TParams['_output'], inferParser<$Parser>['in']>;
    }>>>;
    stage<RStage extends AbstractStage<any, any>>(stage: RStage): IntellisenseFor<'wrap', 'stage', WrapBuilder<Merge<InferWrapParams<TParams>, {
        _stage: OverwriteIfDefined<TParams['_stage'], ExtractStage<RStage>>;
    }>>>;
    prepare(prepare: WrapPrepare<ExtractInput<TParams>, ExtractStageInput<TParams['_stage']>>): IntellisenseFor<'wrap', 'prepare', WrapBuilder<Merge<InferWrapParams<TParams>, {
        _prepare: OverwriteIfDefined<TParams['_prepare'], true>;
    }>>>;
    finalize(finalize: WrapFinalize<ExtractInput<TParams>, ExtractOutput<TParams>, ExtractStageOutput<TParams['_stage']>>): IntellisenseFor<'wrap', 'finalize', WrapBuilder<Merge<InferWrapParams<TParams>, {
        _finalize: OverwriteIfDefined<TParams['_finalize'], true>;
    }>>>;
}
export declare function wrap(_def?: WrapConfig<any, any, any, any>): WrapBuilder<InferWrapParams<{
    _type: 'wrap';
}>>;
