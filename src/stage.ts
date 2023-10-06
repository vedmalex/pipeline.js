import {
  ExtractInput,
  ExtractOutput,
  inferParser,
  InferStageParams,
  IntellisenseFor,
  Merge,
  OverwriteIfDefined,
  Parser,
  SchemaType,
} from './utility'

import { BuilderDef, StageParams } from './base'
import { AbstractStage, FnRun } from './base'

import { BaseStageConfig } from './base'
import { RunConfig } from './base'
import { validatorBaseStageConfig } from './base'
import { validatorRunConfig } from './base'

export class Stage<Input, Output, TConfig extends StageConfig<Input, Output> = StageConfig<Input, Output>>
  extends AbstractStage<Input, Output> {
  constructor(cfg: TConfig) {
    const config = validatorStageConfig<Input, Output>(cfg).parse(cfg) as StageConfig<Input, Output>
    super(config)
  }
}

export type StageConfig<Input, Output> = BaseStageConfig<Input, Output> & RunConfig<Input, Output>

export function validatorStageConfig<Input, Output>(config: StageConfig<Input, Output>) {
  return validatorBaseStageConfig.merge(validatorRunConfig(config))
}
export interface StageDef<TConfig extends StageConfig<any, any>> extends BuilderDef<TConfig> {
}

export interface StageBuilder<TParams extends StageParams> {
  _def: BuilderDef<StageConfig<ExtractInput<TParams>, ExtractOutput<TParams>>>
  input<$Parser extends Parser>(
    schema: SchemaType<TParams, $Parser, '_input', 'in'>,
  ): IntellisenseFor<
    'stage',
    'input',
    StageBuilder<
      Merge<
        InferStageParams<TParams>,
        {
          _input: OverwriteIfDefined<
            TParams['_input'],
            inferParser<$Parser>['in']
          >
        }
      >
    >
  >
  output<$Parser extends Parser>(
    schema: SchemaType<TParams, $Parser, '_output', 'out'>,
  ): IntellisenseFor<
    'stage',
    'output',
    StageBuilder<
      Merge<
        InferStageParams<TParams>,
        {
          _output: OverwriteIfDefined<
            TParams['_output'],
            inferParser<$Parser>['in']
          >
        }
      >
    >
  >
  // где-то теряется тип Params
  run<fnRun extends FnRun<ExtractInput<TParams>, ExtractOutput<TParams>>>(
    fn: fnRun,
  ): IntellisenseFor<
    'stage',
    'run',
    StageBuilder<
      Merge<
        InferStageParams<TParams>,
        {
          _run: OverwriteIfDefined<
            TParams['_run'],
            fnRun
          >
        }
      >
    >
  >
  build(): Stage<
    ExtractInput<TParams>,
    ExtractOutput<TParams>,
    StageConfig<ExtractInput<TParams>, ExtractOutput<TParams>>
  >
}
export function stage<TConfig extends StageConfig<any, any>>(
  _def: Partial<BuilderDef<TConfig>> = {},
): StageBuilder<InferStageParams<{ _type: 'stage' }>> {
  return {
    _def: _def as BuilderDef<TConfig>,
    input(input) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.input = input
      return stage({
        ..._def,
        inputs: input,
      }) as any
    },
    output(output) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.output = output
      return stage({
        ..._def,
        outputs: output,
      }) as any
    },
    run(run) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.run = run as any
      return stage({
        ..._def,
      }) as any
    },
    build() {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      return new Stage(_def.cfg) as any
    },
  }
}
