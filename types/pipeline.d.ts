import { AbstractStage, BaseStageConfig, PipelineParams } from './base';
import { ExtractInput, ExtractOutput, ExtractStageInput, ExtractStageOutput, InferPipelineParams, IntellisenseFor, Merge, OverwriteIfDefined } from './utility';
export declare class Pipeline<Input, Output, Config extends PipelineConfig<Input, Output> = PipelineConfig<Input, Output>> extends AbstractStage<Input, Output, Config> {
    constructor(cfg: Config);
}
export interface PipelineConfig<Input, Output> extends BaseStageConfig<Input, Output> {
    stages: Array<AbstractStage<any, any>>;
}
export interface PipelineBuilder<TParams extends PipelineParams> {
    config: PipelineConfig<ExtractInput<TParams>, ExtractOutput<TParams>>;
    build(): Pipeline<ExtractInput<TParams>, ExtractOutput<TParams>, PipelineConfig<ExtractInput<TParams>, ExtractOutput<TParams>>>;
    addStage<RStage extends AbstractStage<any, any>>(stage: RStage): IntellisenseFor<'pipeline', 'addStage', PipelineBuilder<Merge<InferPipelineParams<TParams>, {
        _input: OverwriteIfDefined<TParams['_input'], ExtractStageInput<RStage>>;
        _output: ExtractStageOutput<RStage>;
    }>>>;
}
export declare function pipeline(config?: PipelineConfig<any, any>): PipelineBuilder<InferPipelineParams<{
    _type: 'pipeline';
}>>;
