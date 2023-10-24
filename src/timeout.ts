import z from 'zod'
import { AbstractStage, BaseStageConfig, TimeoutParams, validatorBaseStageConfig, validatorRunConfig } from './base'
import { ERROR } from './error'
import {
  ExtractInput,
  ExtractOutput,
  ExtractStageInput,
  ExtractStageOutput,
  InferTimeoutParams,
  IntellisenseFor,
  Merge,
  OverwriteIfDefined,
} from './utility'

function useTimeout(timeout: number) {
  return new Promise<boolean>(res => {
    setTimeout(() => {
      res(true)
    }, timeout)
  })
}

async function processIt<Input, Output>(
  this: Timeout<Input, Output>,
  { input }: { input: Input },
): Promise<Output> {
  const timeout = typeof this.config.timeout === 'number' ? this.config.timeout : await this.config.timeout({ input })
  const res = await Promise.race([useTimeout(timeout), this.config.stage.exec({ input })])
  if (typeof res === 'boolean') {
    if (this.config.overdue) {
      return this.config.overdue.exec({ input })
    } else {
      throw new Error(ERROR.operation_timeout_occured)
    }
  } else {
    return res
  }
}

export class Timeout<Input, Output, Config extends TimeoutConfig<Input, Output> = TimeoutConfig<Input, Output>>
  extends AbstractStage<Input, Output, Config> {
  constructor(cfg: Config) {
    super({ ...cfg, run: processIt })
    this.config = validatorTimeoutConfig(this.config).parse(this.config) as unknown as Config
  }
}

export type GetTimout<Input> = (payload: { input: Input }) => Promise<number> | number

export interface TimeoutConfig<Input, Output> extends BaseStageConfig<Input, Output> {
  timeout: number | GetTimout<Input>
  stage: AbstractStage<Input, Output>
  overdue?: AbstractStage<Input, Output>
}

function validatorTimeoutConfig<Input, Output>(
  config: TimeoutConfig<Input, Output>,
) {
  const input = config.stage.config.input ? config.stage.config.input : z.any()

  return validatorBaseStageConfig
    .merge(validatorRunConfig(config))
    .merge(z.object({
      stage: z.instanceof(AbstractStage),
      overdue: z.instanceof(AbstractStage).optional(),
      timeout: z.union([
        z.number(),
        z.function(
          z.tuple([z.object({
            input,
          })]),
          z.union([
            z.number(),
            z.number().promise(),
          ]),
        ),
      ]),
    }))
}

export interface TimeoutBuilder<TParams extends TimeoutParams> {
  config: TimeoutConfig<ExtractInput<TParams>, ExtractOutput<TParams>>
  build(): Timeout<
    ExtractInput<TParams>,
    ExtractOutput<TParams>,
    TimeoutConfig<ExtractInput<TParams>, ExtractOutput<TParams>>
  >
  stage<RStage extends AbstractStage<any, any>>(
    stage: RStage,
  ): IntellisenseFor<
    'timeout',
    'stage',
    TimeoutBuilder<
      Merge<
        InferTimeoutParams<TParams>,
        {
          _stage: OverwriteIfDefined<
            TParams['_stage'],
            RStage
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
    >
  >
  overdue<RStage extends AbstractStage<ExtractInput<TParams>, ExtractOutput<TParams>>>(
    stage: RStage,
  ): IntellisenseFor<
    'timeout',
    'overdue',
    TimeoutBuilder<
      InferTimeoutParams<TParams>
    >
  >
  timeout<Timeout extends number | GetTimout<ExtractStageInput<TParams>>>(
    timeout: Timeout,
  ): IntellisenseFor<
    'stage',
    'input',
    TimeoutBuilder<
      Merge<
        InferTimeoutParams<TParams>,
        {
          _timeout: OverwriteIfDefined<TParams['_timeout'], Timeout>
        }
      >
    >
  >
}

export function timeout(
  config: TimeoutConfig<any, any> = {} as TimeoutConfig<any, any>,
): TimeoutBuilder<InferTimeoutParams<{ _type: 'timeout' }>> {
  return {
    config,
    stage(stage) {
      return timeout({
        ...config,
        stage,
      }) as any
    },
    overdue(overdue) {
      return timeout({
        ...config,
        overdue,
      })
    },
    timeout(period) {
      return timeout({
        ...config,
        timeout: period,
      })
    },
    build() {
      return new Timeout(config)
    },
  }
}
