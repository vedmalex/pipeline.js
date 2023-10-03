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
  ExtractStageInput,
  ExtractStageOutput,
  InferParams,
  IntellisenseFor,
  Merge,
  OverwriteIfDefined,
  UnsetMarker,
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
  input: Input,
): Promise<Output> {
  const timeout = typeof this.config.timeout === 'number' ? this.config.timeout : await this.config.timeout(input)
  const res = await Promise.race([useTimeout(timeout), this.config.stage.exec(input)])
  if (typeof res === 'boolean') {
    if (this.config.overdue) {
      return this.config.overdue.exec(input)
    } else {
      throw new Error('operation timeout occured')
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

export type GetTimout<Input> = (ctx: Input) => Promise<number> | number

export interface TimeoutConfig<Input, Output> extends BaseStageConfig<Input, Output> {
  timeout: number | GetTimout<Input>
  stage: AbstractStage<Input, Output>
  overdue?: AbstractStage<Input, Output>
}

export function validatorTimeoutConfig<Input, Output>(
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
        z.function(z.tuple([input]), z.union([z.number(), z.number().promise()])),
      ]),
    }))
}

export interface TimeoutDef<TConfig extends TimeoutConfig<any, any>> extends BuilderDef<TConfig> {
  stage: AbstractStage<any, any>
  overdue: AbstractStage<any, any>
  timeout: number | GetTimout<any>
}

export interface TimeoutBuilder<TParams extends BuilderParams> {
  _def: BuilderDef<TimeoutConfig<ExtractInput<TParams>, ExtractOutput<TParams>>>
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
        InferParams<TParams>,
        {
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
      InferParams<TParams>
    >
  >
  timeout(
    timeout: number | GetTimout<ExtractStageInput<TParams>>,
  ): IntellisenseFor<
    'stage',
    'input',
    TimeoutBuilder<
      InferParams<TParams>
    >
  >
}

export function timeout<TConfig extends TimeoutConfig<any, any>>(
  _def: Partial<TimeoutDef<TConfig>> = {},
): TimeoutBuilder<{
  _type: UnsetMarker
  _input: UnsetMarker
  _output: UnsetMarker
  _run: UnsetMarker
  _stage: UnsetMarker
  _wrapee_input: UnsetMarker
  _wrapee_output: UnsetMarker
}> {
  return {
    _def: _def as BuilderDef<TConfig>,
    stage(stage) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.stage = stage
      return timeout({
        ..._def,
        stage: stage,
      }) as any
    },
    overdue(stage) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.overdue = stage
      return timeout({
        ..._def,
        overdue: stage,
      }) as any
    },
    timeout(period) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.timeout = period
      return timeout({
        ..._def,
        timeout: period,
      }) as any
    },
    build() {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      return new Timeout(_def.cfg) as any
    },
  }
}
