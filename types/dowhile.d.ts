import { AbstractStage, BaseStageConfig, DoWhileParams } from './base';
import { ErrorMessage, ExtractInput, ExtractOutput, ExtractStage, ExtractStageInput, ExtractStageOutput, InferDoWhileParams, inferParser, IntellisenseFor, Merge, OverwriteIfDefined, Parser, SchemaType } from './utility';
export declare class DoWhile<Input, Output, IInput, IOutput, Config extends DoWhileConfig<Input, Output, IInput, IOutput> = DoWhileConfig<Input, Output, IInput, IOutput>> extends AbstractStage<Input, Input, Config> {
    constructor(cfg: Config);
}
export type DowhileStep<Input, IInput> = (payload: {
    input: Input;
    iteration: number;
}) => IInput | Promise<IInput>;
export type DoWhileCombine<Input, Output, IOutput> = (payload: {
    input: Input;
    output: Output;
    result: IOutput;
    iteration: number;
}) => Output | Promise<Output>;
export type DoWhileCondition<Input> = (payload: {
    input: Input;
    iteration: number;
}) => boolean | Promise<boolean>;
export interface DoWhileConfig<Input, Output, IInput, IOutput> extends BaseStageConfig<Input, Input> {
    while: DoWhileCondition<Input>;
    do: AbstractStage<IInput, IOutput>;
    step: DowhileStep<Input, IInput>;
    combine: DoWhileCombine<Input, Output, IOutput>;
}
export interface DoWhileBuilder<TParams extends DoWhileParams> {
    _def: DoWhileConfig<ExtractInput<TParams>, ExtractOutput<TParams>, any, any>;
    build<Result extends DoWhile<ExtractInput<TParams>, ExtractStageInput<TParams['_stage']>, ExtractStageOutput<TParams['_stage']>, DoWhileConfig<ExtractInput<TParams>, ExtractOutput<TParams>, any, any>>>(): TParams['_step'] extends true ? TParams['_combine'] extends true ? Result : ErrorMessage<'prepare MUST have finalize'> : Result;
    input<$Parser extends Parser>(schema: SchemaType<TParams, $Parser, '_input', 'in'>): IntellisenseFor<'dowhile', 'input', DoWhileBuilder<Merge<InferDoWhileParams<TParams>, {
        _input: OverwriteIfDefined<TParams['_input'], inferParser<$Parser>['in']>;
        _output: OverwriteIfDefined<TParams['_output'], inferParser<$Parser>['in']>;
    }>>>;
    output<$Parser extends Parser>(schema: SchemaType<TParams, $Parser, '_input', 'in'>): IntellisenseFor<'dowhile', 'input', DoWhileBuilder<Merge<InferDoWhileParams<TParams>, {
        _output: OverwriteIfDefined<TParams['_output'], inferParser<$Parser>['in']>;
    }>>>;
    while(reachEnd: DoWhileCondition<ExtractInput<TParams>>): IntellisenseFor<'dowhile', 'while', DoWhileBuilder<InferDoWhileParams<TParams>>>;
    do<RStage extends AbstractStage<any, any>>(stage: RStage): IntellisenseFor<'dowhile', 'do', DoWhileBuilder<Merge<InferDoWhileParams<TParams>, {
        _stage: OverwriteIfDefined<TParams['_stage'], ExtractStage<RStage>>;
    }>>>;
    step(split: DowhileStep<ExtractInput<TParams>, ExtractStageInput<TParams['_stage']>>): IntellisenseFor<'dowhile', 'step', DoWhileBuilder<Merge<InferDoWhileParams<TParams>, {
        _prepare: OverwriteIfDefined<TParams['_step'], true>;
    }>>>;
    combine(combine: DoWhileCombine<ExtractInput<TParams>, ExtractOutput<TParams>, ExtractStageOutput<TParams['_stage']>>): IntellisenseFor<'dowhile', 'combine', DoWhileBuilder<Merge<InferDoWhileParams<TParams>, {
        _combine: OverwriteIfDefined<TParams['_combine'], true>;
    }>>>;
}
export declare function dowhile(_def?: DoWhileConfig<any, any, any, any>): DoWhileBuilder<InferDoWhileParams<{
    _type: 'dowhile';
}>>;
