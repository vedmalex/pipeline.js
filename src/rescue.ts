import z from 'zod'
import { AbstractStage, BaseStageConfig, RescueParams, validatorBaseStageConfig, validatorRunConfig } from './base'
import { ERROR } from './error'
import {
  ExtractInput,
  ExtractOutput,
  ExtractStage,
  ExtractStageInput,
  ExtractStageOutput,
  InferRescueParams,
  IntellisenseFor,
  Merge,
  OverwriteIfDefined,
} from './utility'

async function processIt<Input, Output>(
  this: Rescue<Input, Output>,
  { input }: { input: Input },
): Promise<Output> {
  try {
    const result = await this.config.stage.exec({ input })
    return result
  } catch (err) {
    const rescued = await this.config.rescue({ error: err as Error, input })
    if (!rescued) {
      throw new Error(ERROR.rescue_MUST_return_value)
    }
    return rescued
  }
}

export class Rescue<
  Input,
  Output,
  Config extends RescueConfig<Input, Output> = RescueConfig<Input, Output>,
> extends AbstractStage<Input, Output, Config> {
  constructor(cfg: Config) {
    super({ ...cfg, run: processIt })
    this.config = validatorRescueConfig(this.config).parse(this.config) as unknown as Config
  }
}

export type RescueRun<Input, Output> = (payload: { error?: Error; input: Input }) => Promise<Output> | Output

export interface RescueConfig<Input, Output> extends BaseStageConfig<Input, Output> {
  stage: AbstractStage<Input, Output>
  rescue: RescueRun<Input, Output>
}

function validatorRescueConfig<Input, Output>(
  config: BaseStageConfig<Input, Output>,
) {
  const output: z.ZodSchema = config.output ? config.output : z.any()
  const input: z.ZodSchema = config.input ? config.input : z.any()
  return validatorBaseStageConfig
    .merge(validatorRunConfig(config))
    .merge(z.object({
      stage: z.instanceof(AbstractStage),
      rescue: z.function(
        z.tuple([z.object({
          error: z.union([z.instanceof(Error), z.undefined()]),
          input,
        })]),
        z.union([output.promise(), output]),
      ),
    }))
}

export interface RescueBuilder<TParams extends RescueParams> {
  _def: RescueConfig<ExtractInput<TParams>, ExtractOutput<TParams>>
  build(): Rescue<
    ExtractInput<TParams>,
    ExtractOutput<TParams>,
    RescueConfig<ExtractInput<TParams>, ExtractOutput<TParams>>
  >
  stage<RStage extends AbstractStage<any, any>>(
    stage: RStage,
  ): IntellisenseFor<
    'rescue',
    'stage',
    RescueBuilder<
      Merge<
        InferRescueParams<TParams>,
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
    >
  >
  rescue(
    rescue: RescueRun<ExtractInput<TParams>, ExtractOutput<TParams>>,
  ): IntellisenseFor<
    'rescue',
    'rescue',
    RescueBuilder<
      InferRescueParams<TParams>
    >
  >
}

export function rescue<TConfig extends RescueConfig<any, any>>(
  _def: Partial<TConfig> = {},
): RescueBuilder<InferRescueParams<{ _type: 'rescue' }>> {
  return {
    _def: _def as TConfig,
    stage(stage) {
      return rescue({
        ..._def,
        stage,
      }) as any
    },
    rescue(fn) {
      return rescue({
        ..._def,
        rescue: fn as any,
      }) as any
    },
    build() {
      return new Rescue(_def as TConfig) as any
    },
  }
}
