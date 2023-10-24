import { AbstractStage, BaseStageConfig, MultiWaySwitchCaseParams, MultiWaySwitchParams } from './base';
import { ExtractInput, ExtractOutput, ExtractStage, ExtractStageInput, ExtractStageOutput, InferMultiWaySwitchCaseParams, InferMultiWaySwitchParams, IntellisenseFor, Merge, MergeIfDefined, OverwriteIfDefined } from './utility';
export declare class MultiWaySwitch<Input, Output, Config extends MultWaySwitchConfig<Input, Output> = MultWaySwitchConfig<Input, Output>> extends AbstractStage<Input, Output, Config> {
    constructor(cfg: Config);
}
export interface MultWaySwitchConfig<Input, Output> extends BaseStageConfig<Input, Output> {
    cases: Array<MultiWaySwitchCase<Input, Output>>;
}
export declare class MultiWaySwitchCase<Input, Output, Config extends MultiWaySwitchCaseConfig<Input, Output> = MultiWaySwitchCaseConfig<Input, Output>> extends AbstractStage<Input, Output, Config> {
    constructor(cfg: Config);
}
export type StageEvaluateFunction<Input> = (payload: {
    input: Input;
}) => Promise<boolean> | boolean;
export interface MultiWaySwitchCaseConfig<Input, Output> extends BaseStageConfig<Input, Output> {
    stage: AbstractStage<Input, Output>;
    evaluate: StageEvaluateFunction<Input>;
}
export interface MultiWaySwitchBuilder<TParams extends MultiWaySwitchParams> {
    _def: MultWaySwitchConfig<ExtractInput<TParams>, ExtractOutput<TParams>>;
    build<I extends ExtractInput<TParams>, O extends ExtractOutput<TParams>>(): MultiWaySwitch<I, O, MultWaySwitchConfig<I, O>>;
    add<AddCase extends MultiWaySwitchCase<any, any>>(input: AddCase): IntellisenseFor<'multiwayswitch', 'add', MultiWaySwitchBuilder<Merge<InferMultiWaySwitchParams<TParams>, {
        _input: MergeIfDefined<TParams['_input'], ExtractStageInput<AddCase>>;
        _output: MergeIfDefined<TParams['_output'], ExtractStageOutput<AddCase>>;
    }>>>;
}
export interface MultiWaySwitchCaseBuilder<TParams extends MultiWaySwitchCaseParams> {
    _def: MultiWaySwitchCaseConfig<ExtractInput<TParams>, ExtractOutput<TParams>>;
    build(): MultiWaySwitchCase<ExtractInput<TParams>, ExtractOutput<TParams>>;
    stage<RStage extends AbstractStage<any, any>>(stage: RStage): IntellisenseFor<'multiwayswitchcase', 'stage', MultiWaySwitchCaseBuilder<Merge<InferMultiWaySwitchCaseParams<TParams>, {
        _stage: OverwriteIfDefined<TParams['_stage'], ExtractStage<RStage>>;
        _input: OverwriteIfDefined<TParams['_input'], ExtractStageInput<RStage>>;
        _output: OverwriteIfDefined<TParams['_output'], ExtractStageOutput<RStage>>;
    }>>>;
    evaluate(evaluate: StageEvaluateFunction<ExtractStageInput<TParams['_stage']>>): IntellisenseFor<'multiwayswitchcase', 'evaluate', MultiWaySwitchCaseBuilder<Merge<InferMultiWaySwitchCaseParams<TParams>, {
        _evaluate: OverwriteIfDefined<TParams['_evaluate'], true>;
    }>>>;
}
export declare function multiwayswitch(_def?: MultWaySwitchConfig<any, any>): MultiWaySwitchBuilder<InferMultiWaySwitchParams<{
    _type: 'multiwayswitch';
}>>;
export declare function multiwayswitchcase(_def?: MultiWaySwitchCaseConfig<any, any>): MultiWaySwitchCaseBuilder<InferMultiWaySwitchCaseParams<{
    _type: 'multiwayswitchcase';
}>>;
