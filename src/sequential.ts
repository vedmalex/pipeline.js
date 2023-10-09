import { z } from 'zod'
import { AbstractStage, SequentialParams, validatorBaseStageConfig, validatorRunConfig } from './base'
import { CreateError } from './error'
import { ParallelError } from './error'
import { StageConfig } from './stage'
import {
  ExtractInput,
  ExtractOutput,
  ExtractStage,
  ExtractStageInput,
  ExtractStageOutput,
  InferSequentialParams,
  IntellisenseFor,
  Merge,
  OverwriteIfDefined,
} from './utility'

async function sequentialProcessIt<
  Input,
  Output,
  Config extends SequentialConfig<Input, Output> = SequentialConfig<
    Input,
    Output
  >,
>(
  this: Sequential<Input, Output, Config>,
  { input }: { input: Array<Input> },
): Promise<Array<Output>> {
  let result: Array<Output> = []
  for (let i = 0; i < input.length; i++) {
    const item = input[i]
    const stageResult = await this.config.stage.exec({ input: item })
    result.push(stageResult)
  }
  return result
}

async function parallelProcessIt<
  Input,
  Output,
  Config extends SequentialConfig<Input, Output> = SequentialConfig<
    Input,
    Output
  >,
>(
  this: Sequential<Input, Output, Config>,
  { input }: { input: Array<Input> },
): Promise<Array<Output>> {
  const presult = await Promise.allSettled(input.map(item => this.config.stage.exec({ input: item })))

  let errors: Array<any> = []
  let result: Array<Output> = []

  for (let i = 0; i < presult.length; i++) {
    const item = presult[i]
    if (item.status == 'fulfilled') {
      result.push(item.value)
    } else {
      errors.push(
        new ParallelError({
          index: i,
          ctx: input[i],
          err: item.reason,
        }),
      )
    }
  }
  if (errors.length > 0) {
    throw CreateError(errors)
  }
  return result
}

export class Sequential<
  Input,
  Output,
  Config extends SequentialConfig<Input, Output> = SequentialConfig<
    Input,
    Output
  >,
> extends AbstractStage<Input, Output, Config> {
  constructor(cfg: Config) {
    super({ ...cfg, run: cfg.serial ? sequentialProcessIt : parallelProcessIt })
    this.config = validatorSequentialConfig(this.config).parse(this.config) as unknown as Config
  }
}

export interface SequentialConfig<Input, Output> extends StageConfig<Input, Output> {
  serial?: boolean
  stage: AbstractStage<Input, Output>
}

export function validatorSequentialConfig<Input, Output>(
  config: SequentialConfig<Input, Output>,
) {
  return validatorBaseStageConfig
    .merge(validatorRunConfig(config))
    .merge(z.object({
      serial: z.boolean().optional(),
      stage: z.instanceof(AbstractStage),
    }))
}

export interface SequentialBuilder<TParams extends SequentialParams> {
  _def: SequentialConfig<ExtractInput<TParams>, ExtractOutput<TParams>>
  serial(): IntellisenseFor<
    'sequential',
    'serial',
    SequentialBuilder<
      Merge<
        InferSequentialParams<TParams>,
        {
          _serial: OverwriteIfDefined<
            TParams['_serial'],
            true
          >
        }
      >
    >
  >
  build(): Sequential<
    Array<ExtractStageInput<TParams['_stage']>>,
    Array<ExtractStageOutput<TParams['_stage']>>
  >

  stage<RStage extends AbstractStage<any, any>>(
    stage: RStage,
  ): IntellisenseFor<
    'sequential',
    'stage',
    SequentialBuilder<
      Merge<
        InferSequentialParams<TParams>,
        {
          _stage: OverwriteIfDefined<
            TParams['_stage'],
            ExtractStage<RStage>
          >
        }
      >
    >
  >
}

export function sequential(
  _def: SequentialConfig<any, any> = {} as SequentialConfig<any, any>,
): SequentialBuilder<InferSequentialParams<{ _type: 'sequential' }>> {
  return {
    _def,
    serial() {
      return sequential({
        ..._def,
        serial: true,
      }) as any
    },
    stage(stage) {
      return sequential({
        ..._def,
        stage,
      }) as any
    },
    build() {
      return new Sequential(_def) as any
    },
  }
}
