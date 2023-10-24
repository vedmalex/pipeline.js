import { AbstractStage, BaseStageConfig, RescueParams } from './base';
import { ExtractInput, ExtractOutput, ExtractStage, ExtractStageInput, ExtractStageOutput, InferRescueParams, IntellisenseFor, Merge, OverwriteIfDefined } from './utility';
export declare class Rescue<Input, Output, Config extends RescueConfig<Input, Output> = RescueConfig<Input, Output>> extends AbstractStage<Input, Output, Config> {
    constructor(cfg: Config);
}
export type RescueRun<Input, Output> = (payload: {
    error?: Error;
    input: Input;
}) => Promise<Output> | Output;
export interface RescueConfig<Input, Output> extends BaseStageConfig<Input, Output> {
    stage: AbstractStage<Input, Output>;
    rescue: RescueRun<Input, Output>;
}
export interface RescueBuilder<TParams extends RescueParams> {
    _def: RescueConfig<ExtractInput<TParams>, ExtractOutput<TParams>>;
    build(): Rescue<ExtractInput<TParams>, ExtractOutput<TParams>, RescueConfig<ExtractInput<TParams>, ExtractOutput<TParams>>>;
    stage<RStage extends AbstractStage<any, any>>(stage: RStage): IntellisenseFor<'rescue', 'stage', RescueBuilder<Merge<InferRescueParams<TParams>, {
        _stage: OverwriteIfDefined<TParams['_stage'], ExtractStage<RStage>>;
        _input: OverwriteIfDefined<TParams['_input'], ExtractStageInput<RStage>>;
        _output: OverwriteIfDefined<TParams['_output'], ExtractStageOutput<RStage>>;
    }>>>;
    rescue(rescue: RescueRun<ExtractInput<TParams>, ExtractOutput<TParams>>): IntellisenseFor<'rescue', 'rescue', RescueBuilder<InferRescueParams<TParams>>>;
}
export declare function rescue<TConfig extends RescueConfig<any, any>>(_def?: Partial<TConfig>): RescueBuilder<InferRescueParams<{
    _type: 'rescue';
}>>;
