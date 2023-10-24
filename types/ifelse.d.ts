import { AbstractStage, BaseStageConfig, IfElseParams } from './base';
import { ExtractInput, ExtractOutput, ExtractStageInput, ExtractStageOutput, InferIfElseParams, IntellisenseFor, MaySetInput, MaySetOutput, Merge, OverwriteIfDefined, UnsetMarker } from './utility';
export type IfElseCondition<Input> = (payload: {
    input: Input;
}) => boolean | Promise<boolean>;
export declare class IfElse<Input, Output, Config extends IfElseConfig<Input, Output> = IfElseConfig<Input, Output>> extends AbstractStage<Input, Output, Config> {
    constructor(cfg: Config);
}
export interface IfElseConfig<Input, Output> extends BaseStageConfig<Input, Output> {
    if: IfElseCondition<Input>;
    then: AbstractStage<Input, Output>;
    else?: AbstractStage<Input, Output>;
}
export interface IfElseBuilder<TParams extends IfElseParams> {
    config: IfElseConfig<ExtractInput<TParams>, ExtractOutput<TParams>>;
    if(timeout: IfElseCondition<OverwriteIfDefined<ExtractInput<TParams>, unknown>>): IntellisenseFor<'ifelse', 'if', IfElseBuilder<InferIfElseParams<TParams>>>;
    then<RStage extends AbstractStage<MaySetInput<TParams>, MaySetOutput<TParams>>>(stage: TParams['_stage'] extends UnsetMarker ? RStage : never): TParams['_stage'] extends UnsetMarker ? IntellisenseFor<'ifelse', 'then', IfElseBuilder<Merge<InferIfElseParams<TParams>, {
        _stage: OverwriteIfDefined<TParams['_stage'], ExtractStageInput<RStage>>;
        _input: OverwriteIfDefined<TParams['_input'], ExtractStageInput<RStage>>;
        _output: OverwriteIfDefined<TParams['_output'], ExtractStageOutput<RStage>>;
    }>>> : never;
    stage<RStage extends AbstractStage<MaySetInput<TParams>, MaySetOutput<TParams>>>(stage: TParams['_stage'] extends UnsetMarker ? RStage : never): TParams['_stage'] extends UnsetMarker ? IntellisenseFor<'ifelse', 'stage', IfElseBuilder<Merge<InferIfElseParams<TParams>, {
        _stage: OverwriteIfDefined<TParams['_stage'], ExtractStageInput<RStage>>;
        _input: OverwriteIfDefined<TParams['_input'], ExtractStageInput<RStage>>;
        _output: OverwriteIfDefined<TParams['_output'], ExtractStageOutput<RStage>>;
    }>>> : never;
    else<RStage extends AbstractStage<ExtractInput<TParams>, ExtractOutput<TParams>>>(stage: RStage): IntellisenseFor<'ifelse', 'else', IfElseBuilder<InferIfElseParams<TParams>>>;
    build(): IfElse<ExtractInput<TParams>, ExtractOutput<TParams>, IfElseConfig<ExtractInput<TParams>, ExtractOutput<TParams>>>;
}
export declare function ifelse(config?: IfElseConfig<any, any>): IfElseBuilder<InferIfElseParams<{
    _type: 'ifelse';
}>>;
