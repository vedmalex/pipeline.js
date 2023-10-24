import { AbstractStage, SequentialParams } from './base';
import { StageConfig } from './stage';
import { ExtractInput, ExtractOutput, ExtractStage, ExtractStageInput, ExtractStageOutput, InferSequentialParams, IntellisenseFor, Merge, OverwriteIfDefined } from './utility';
export declare class Sequential<Input, Output, Config extends SequentialConfig<Input, Output> = SequentialConfig<Input, Output>> extends AbstractStage<Input, Output, Config> {
    constructor(cfg: Config);
}
export interface SequentialConfig<Input, Output> extends StageConfig<Input, Output> {
    serial?: boolean;
    stage: AbstractStage<Input, Output>;
}
export interface SequentialBuilder<TParams extends SequentialParams> {
    _def: SequentialConfig<ExtractInput<TParams>, ExtractOutput<TParams>>;
    serial(): IntellisenseFor<'sequential', 'serial', SequentialBuilder<Merge<InferSequentialParams<TParams>, {
        _serial: OverwriteIfDefined<TParams['_serial'], true>;
    }>>>;
    build(): Sequential<Array<ExtractStageInput<TParams['_stage']>>, Array<ExtractStageOutput<TParams['_stage']>>>;
    stage<RStage extends AbstractStage<any, any>>(stage: RStage): IntellisenseFor<'sequential', 'stage', SequentialBuilder<Merge<InferSequentialParams<TParams>, {
        _stage: OverwriteIfDefined<TParams['_stage'], ExtractStage<RStage>>;
    }>>>;
}
export declare function sequential(_def?: SequentialConfig<any, any>): SequentialBuilder<InferSequentialParams<{
    _type: 'sequential';
}>>;
