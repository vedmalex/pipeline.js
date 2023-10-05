import { z } from 'zod'
import {
  AbstractStage,
  BaseStageConfig,
  BuilderDef,
  PipelineParams,
  validatorBaseStageConfig,
  validatorRunConfig,
} from './base'
import {
  ExtractInput,
  ExtractOutput,
  ExtractStageInput,
  ExtractStageOutput,
  InferPipelineParams,
  IntellisenseFor,
  Merge,
  OverwriteIfDefined,
} from './utility'

async function processIt<Input, Output>(
  this: Pipeline<Input, Output>,
  _input: Input,
): Promise<Output> {
  let iteration = 0
  let input: any = _input
  let result: any = _input

  while (iteration < this.config.stages.length) {
    input = result = await this.config.stages[iteration++].exec(input)
  }
  return result
}

export class Pipeline<Input, Output, Config extends PipelineConfig<Input, Output> = PipelineConfig<Input, Output>>
  extends AbstractStage<Input, Output, Config> {
  constructor(cfg: Config) {
    super({ ...cfg, run: processIt })
    this.config = validatorPipelineConfig(this.config).parse(this.config) as unknown as Config
  }
}

export interface PipelineConfig<Input, Output> extends BaseStageConfig<Input, Output> {
  stages: Array<AbstractStage<any, any>>
}

export function validatorPipelineConfig<Input, Output>(
  config: BaseStageConfig<Input, Output>,
) {
  return validatorBaseStageConfig
    .merge(validatorRunConfig(config))
    .merge(z.object({
      stages: z.array(z.instanceof(AbstractStage)),
    }))
}

export interface PipelineDef<TConfig extends PipelineConfig<any, any>> extends BuilderDef<TConfig> {
  stages: Array<AbstractStage<any, any>>
}

export interface PipelineBuilder<TParams extends PipelineParams> {
  _def: BuilderDef<PipelineConfig<ExtractInput<TParams>, ExtractOutput<TParams>>>
  build(): Pipeline<
    ExtractInput<TParams>,
    ExtractOutput<TParams>,
    PipelineConfig<ExtractInput<TParams>, ExtractOutput<TParams>>
  >
  stage<RStage extends AbstractStage<any, any>>(
    stage: RStage,
  ): IntellisenseFor<
    'pipeline',
    'stage',
    PipelineBuilder<
      Merge<
        InferPipelineParams<TParams>,
        {
          _input: OverwriteIfDefined<
            TParams['_input'],
            ExtractStageInput<RStage>
          >
          _output: ExtractStageOutput<RStage>
        }
      >
    >
  >
}

export function pipeline<TConfig extends PipelineConfig<any, any>>(
  _def: Partial<PipelineDef<TConfig>> = {},
): PipelineBuilder<InferPipelineParams<{ _type: 'pipeline' }>> {
  return {
    _def: _def as BuilderDef<TConfig>,
    stage(stage) {
      if (!_def.cfg) {
        _def.cfg = {} as any
      }
      if (_def.cfg && !_def.cfg?.stages) {
        _def.cfg.stages = [] as any
      }
      _def.cfg?.stages.push(stage)
      return pipeline({
        ..._def,
        stages: _def.cfg?.stages,
      }) as any
    },
    build() {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      return new Pipeline(_def.cfg) as any
    },
  }
}
