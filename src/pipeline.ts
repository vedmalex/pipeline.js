import z from 'zod'
import { AbstractStage, BaseStageConfig, PipelineParams, validatorBaseStageConfig, validatorRunConfig } from './base'
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
  payload: { input: Input },
): Promise<Output> {
  let iteration = 0
  let input: any = payload.input
  let result: any = payload.input

  while (iteration < this.config.stages.length) {
    input = result = await this.config.stages[iteration++].exec({ input })
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

function validatorPipelineConfig<Input, Output>(
  config: BaseStageConfig<Input, Output>,
) {
  return validatorBaseStageConfig
    .merge(validatorRunConfig(config))
    .merge(z.object({
      stages: z.array(z.instanceof(AbstractStage)),
    }))
}

export interface PipelineBuilder<TParams extends PipelineParams> {
  config: PipelineConfig<ExtractInput<TParams>, ExtractOutput<TParams>>
  build(): Pipeline<
    ExtractInput<TParams>,
    ExtractOutput<TParams>,
    PipelineConfig<ExtractInput<TParams>, ExtractOutput<TParams>>
  >
  addStage<RStage extends AbstractStage<any, any>>(
    stage: RStage,
  ): IntellisenseFor<
    'pipeline',
    'addStage',
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

export function pipeline(
  config: PipelineConfig<any, any> = { stages: [] },
): PipelineBuilder<InferPipelineParams<{ _type: 'pipeline' }>> {
  return {
    config: config,
    addStage(stage) {
      config.stages.push(stage)
      return pipeline(config) as any
    },
    build() {
      return new Pipeline(config) as any
    },
  }
}
