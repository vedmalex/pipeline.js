import { z } from 'zod'
import {
  AbstractStage,
  BaseStageConfig,
  BuilderDef,
  RescueParams,
  validatorBaseStageConfig,
  validatorRunConfig,
} from './base'
import { ERROR } from './errors'
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
  input: Input,
): Promise<Output> {
  try {
    const result = await this.config.stage.exec(input)
    return result
  } catch (err) {
    const rescued = await this.config.rescue(err as Error, input)
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

export type RescueRun<Input, Output> = (
  err: Error | undefined,
  ctx: Input,
) => Promise<Output> | Output

export interface RescueConfig<Input, Output> extends BaseStageConfig<Input, Output> {
  stage: AbstractStage<Input, Output>
  rescue: RescueRun<Input, Output>
}

export function validatorRescueConfig<Input, Output>(
  config: BaseStageConfig<Input, Output>,
) {
  const output: z.ZodSchema = config.output ? config.output : z.any()
  const input: z.ZodSchema = config.input ? config.input : z.any()
  return validatorBaseStageConfig
    .merge(validatorRunConfig(config))
    .merge(z.object({
      stage: z.instanceof(AbstractStage),
      rescue: z.function(
        z.tuple([z.union([z.instanceof(Error), z.undefined()]), input]),
        z.union([output.promise(), output]),
      ),
    }))
}
export interface RescueDef<TConfig extends RescueConfig<any, any>> extends BuilderDef<TConfig> {
  stage: AbstractStage<any, any>
  rescue: RescueRun<any, any>
}
export interface RescueBuilder<TParams extends RescueParams> {
  _def: BuilderDef<RescueConfig<ExtractInput<TParams>, ExtractOutput<TParams>>>
  build(): Rescue<
    ExtractInput<TParams>,
    ExtractOutput<TParams>,
    RescueConfig<ExtractInput<TParams>, ExtractOutput<TParams>>
  >
  stage<RStage extends AbstractStage<ExtractInput<TParams>, ExtractOutput<TParams>>>(
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
  _def: Partial<RescueDef<TConfig>> = {},
): RescueBuilder<InferRescueParams<{ _type: 'rescue' }>> {
  return {
    _def: _def as BuilderDef<TConfig>,
    stage(stage) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.stage = stage
      return rescue({
        ..._def,
        stage: stage,
      }) as any
    },
    rescue(fn) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      if (_def.cfg.stage) {
        _def.cfg.input = _def.cfg.stage.config.input
        _def.cfg.output = _def.cfg.stage.config.output
      } else {
        throw new Error(ERROR.define_stage_before_use_of_rescue)
      }
      _def.cfg.rescue = fn
      return rescue({
        ..._def,
        rescue: fn as any,
      }) as any
    },
    build() {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      return new Rescue(_def.cfg) as any
    },
  }
}
