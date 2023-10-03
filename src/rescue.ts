import { z } from 'zod'
import {
  AbstractStage,
  BaseStageConfig,
  BuilderDef,
  BuilderParams,
  validatorBaseStageConfig,
  validatorRunConfig,
} from './base'
import {
  ExtractInput,
  ExtractOutput,
  ExtractStage,
  ExtractStageInput,
  ExtractStageOutput,
  InferParams,
  IntellisenseFor,
  Merge,
  OverwriteIfDefined,
  UnsetMarker,
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
      throw new Error('rescue MUST return value')
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
  const output: z.ZodSchema = config?.output ? config.output : z.any()
  const input: z.ZodSchema = config?.input ? config.input : z.any()
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
export interface RescueBuilder<TParams extends BuilderParams> {
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
        InferParams<TParams>,
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
      InferParams<TParams>
    >
  >
}
export function rescue<TConfig extends RescueConfig<any, any>>(
  _def: Partial<RescueDef<TConfig>> = {},
): RescueBuilder<{
  _type: UnsetMarker
  _input: UnsetMarker
  _output: UnsetMarker
  _run: UnsetMarker
  _stage: UnsetMarker
  _wrapee_input: UnsetMarker
  _wrapee_output: UnsetMarker
  _usage: {}
}> {
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
        throw new Error('define stage before use of rescue')
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
