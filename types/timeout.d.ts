import { AbstractStage, BaseStageConfig, TimeoutParams } from './base';
import { ExtractInput, ExtractOutput, ExtractStageInput, ExtractStageOutput, InferTimeoutParams, IntellisenseFor, Merge, OverwriteIfDefined } from './utility';
export declare class Timeout<Input, Output, Config extends TimeoutConfig<Input, Output> = TimeoutConfig<Input, Output>> extends AbstractStage<Input, Output, Config> {
    constructor(cfg: Config);
}
export type GetTimout<Input> = (payload: {
    input: Input;
}) => Promise<number> | number;
export interface TimeoutConfig<Input, Output> extends BaseStageConfig<Input, Output> {
    timeout: number | GetTimout<Input>;
    stage: AbstractStage<Input, Output>;
    overdue?: AbstractStage<Input, Output>;
}
export interface TimeoutBuilder<TParams extends TimeoutParams> {
    config: TimeoutConfig<ExtractInput<TParams>, ExtractOutput<TParams>>;
    build(): Timeout<ExtractInput<TParams>, ExtractOutput<TParams>, TimeoutConfig<ExtractInput<TParams>, ExtractOutput<TParams>>>;
    stage<RStage extends AbstractStage<any, any>>(stage: RStage): IntellisenseFor<'timeout', 'stage', TimeoutBuilder<Merge<InferTimeoutParams<TParams>, {
        _stage: OverwriteIfDefined<TParams['_stage'], RStage>;
        _input: OverwriteIfDefined<TParams['_input'], ExtractStageInput<RStage>>;
        _output: OverwriteIfDefined<TParams['_output'], ExtractStageOutput<RStage>>;
    }>>>;
    overdue<RStage extends AbstractStage<ExtractInput<TParams>, ExtractOutput<TParams>>>(stage: RStage): IntellisenseFor<'timeout', 'overdue', TimeoutBuilder<InferTimeoutParams<TParams>>>;
    timeout<Timeout extends number | GetTimout<ExtractStageInput<TParams>>>(timeout: Timeout): IntellisenseFor<'stage', 'input', TimeoutBuilder<Merge<InferTimeoutParams<TParams>, {
        _timeout: OverwriteIfDefined<TParams['_timeout'], Timeout>;
    }>>>;
}
export declare function timeout(config?: TimeoutConfig<any, any>): TimeoutBuilder<InferTimeoutParams<{
    _type: 'timeout';
}>>;
