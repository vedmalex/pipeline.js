import { ExtractInput, ExtractOutput, inferParser, InferStageParams, IntellisenseFor, Merge, OverwriteIfDefined, Parser, SchemaType } from './utility';
import { StageParams } from './base';
import { AbstractStage, FnRun } from './base';
import { BaseStageConfig } from './base';
import { RunConfig } from './base';
export declare class Stage<Input, Output, TConfig extends StageConfig<Input, Output> = StageConfig<Input, Output>> extends AbstractStage<Input, Output> {
    constructor(cfg: TConfig);
}
export type StageConfig<Input, Output> = BaseStageConfig<Input, Output> & RunConfig<Input, Output>;
export interface StageBuilder<TParams extends StageParams> {
    _def: StageConfig<ExtractInput<TParams>, ExtractOutput<TParams>>;
    input<$Parser extends Parser>(schema: SchemaType<TParams, $Parser, '_input', 'in'>): IntellisenseFor<'stage', 'input', StageBuilder<Merge<InferStageParams<TParams>, {
        _input: OverwriteIfDefined<TParams['_input'], inferParser<$Parser>['in']>;
    }>>>;
    output<$Parser extends Parser>(schema: SchemaType<TParams, $Parser, '_output', 'out'>): IntellisenseFor<'stage', 'output', StageBuilder<Merge<InferStageParams<TParams>, {
        _output: OverwriteIfDefined<TParams['_output'], inferParser<$Parser>['in']>;
    }>>>;
    run<fnRun extends FnRun<ExtractInput<TParams>, ExtractOutput<TParams>>>(fn: fnRun): IntellisenseFor<'stage', 'run', StageBuilder<Merge<InferStageParams<TParams>, {
        _run: OverwriteIfDefined<TParams['_run'], fnRun>;
    }>>>;
    build(): Stage<ExtractInput<TParams>, ExtractOutput<TParams>, StageConfig<ExtractInput<TParams>, ExtractOutput<TParams>>>;
}
export declare function stage<TConfig extends StageConfig<any, any>>(_def?: TConfig): StageBuilder<InferStageParams<{
    _type: 'stage';
}>>;
