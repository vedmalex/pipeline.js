import { AbstractStage } from '../stage/AbstractStage'
import { Stage } from '../stage/stage'
import { BaseStageConfig, Run, StageConfig } from '../stage/StageConfig'
import { Rescue } from '../stages/rescue'
import { RescueConfig, RescueRun } from '../stages/rescue/RescueConfig'
import { Merge } from './utility'
import { inferParser } from './utility'
import { ExtractStageInput } from './utility'
import { ExtractStageOutput } from './utility'
import { ExtractStage } from './utility'
import { OverwriteIfDefined } from './utility'
import { GetStage } from './utility'
import { ExtractInput } from './utility'
import { ExtractOutput } from './utility'
import { InferParams } from './utility'
import { InferKeys } from './utility'
import { SchemaType } from './utility'
import { Parser } from './utility'

export type StageType =
  | 'stage'
  | 'wrap'
  | 'rescue'
  | 'timeout'
  | 'retry'
  | 'ifelse'
  | 'dowhile'
  | 'multiwayswitch'
  | 'parallel'
  | 'sequential'
  | 'empty'

export interface BuilderParams {
  _type: unknown
  _input: unknown
  _output: unknown
  _usage: {}
  // stage
  _run: unknown
  // rescue
  _stage: unknown
}

export type AnyStageConfig = StageConfig<any, any>

export interface BuilderDef<TConfig extends BaseStageConfig<any, any>> {
  type: StageType
  inputs: Parser
  outputs: Parser
  cfg: TConfig
}

export interface StageDef<TConfig extends StageConfig<any, any>> extends BuilderDef<TConfig> {
}

export interface RescueDef<TConfig extends RescueConfig<any, any>> extends BuilderDef<TConfig> {
  stage: AbstractStage<any, any>
  rescue: RescueRun<any, any>
}

export interface Builder<TParams extends BuilderParams> {
  _def: BuilderDef<BaseStageConfig<ExtractInput<TParams>, ExtractOutput<TParams>>>
  type<T extends StageType>(type: T): Omit<
    GetStage<T, InferParams<TParams, Builder<TParams>, 'type'>>,
    InferKeys<TParams['_usage']> | 'type'
  >
}

export interface StageBuilder<TParams extends BuilderParams> {
  _def: BuilderDef<StageConfig<ExtractInput<TParams>, ExtractOutput<TParams>>>
  input<$Parser extends Parser>(
    schema: SchemaType<TParams, $Parser, '_input', 'in'>,
  ): Omit<
    StageBuilder<
      Merge<
        InferParams<TParams, StageBuilder<TParams>, 'input'>,
        {
          _input: OverwriteIfDefined<
            TParams['_input'],
            inferParser<$Parser>['in']
          >
        }
      >
    >,
    Exclude<InferKeys<TParams['_usage']> | 'input', 'output' | 'run'>
  >
  output<$Parser extends Parser>(
    schema: SchemaType<TParams, $Parser, '_output', 'out'>,
  ): Omit<
    StageBuilder<
      Merge<
        InferParams<TParams, StageBuilder<TParams>, 'output'>,
        {
          _output: OverwriteIfDefined<
            TParams['_output'],
            inferParser<$Parser>['in']
          >
        }
      >
    >,
    Exclude<InferKeys<TParams['_usage']> | 'ouput', 'run'>
  >
  // где-то теряется тип Params
  run(
    fn: Run<ExtractInput<TParams>, ExtractOutput<TParams>>,
  ): TParams extends BuilderParams ? Omit<
      StageBuilder<
        InferParams<TParams, StageBuilder<TParams>, 'run'>
      >,
      Exclude<InferKeys<TParams['_usage']> | 'run', 'build'>
    >
    : never
  build(): Stage<
    ExtractInput<TParams>,
    ExtractOutput<TParams>,
    StageConfig<ExtractInput<TParams>, ExtractOutput<TParams>>
  >
}

export interface RescueBuilder<TParams extends BuilderParams> {
  _def: BuilderDef<RescueConfig<ExtractInput<TParams>, ExtractOutput<TParams>>>
  build(): Rescue<
    ExtractInput<TParams>,
    ExtractOutput<TParams>,
    RescueConfig<ExtractInput<TParams>, ExtractOutput<TParams>>
  >
  stage<RStage extends AbstractStage<ExtractInput<TParams>, ExtractOutput<TParams>>>(
    stage: RStage,
  ): Omit<
    RescueBuilder<
      Merge<
        InferParams<TParams, RescueBuilder<TParams>, 'stage'>,
        {
          _stage: OverwriteIfDefined<
            TParams['_stage'],
            ExtractStage<RStage>
          >
          _input: OverwriteIfDefined<
            TParams['_input'],
            ExtractStageInput<RStage>
          >
          _output: OverwriteIfDefined<
            TParams['_output'],
            ExtractStageOutput<RStage>
          >
        }
      >
    >,
    InferKeys<TParams['_usage']> | 'stage'
  >
  rescue(rescue: RescueRun<ExtractInput<TParams>, ExtractOutput<TParams>>): Omit<
    RescueBuilder<
      InferParams<TParams, RescueBuilder<TParams>, 'rescue'>
    >,
    Exclude<InferKeys<TParams['_usage']> | 'rescue', 'build'>
  >
}
