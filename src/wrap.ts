import {
  ExtractInput,
  ExtractOutput,
  ExtractStage,
  ExtractStageInput,
  ExtractStageOutput,
  ExtractWrapeeInput,
  ExtractWrapeeOutput,
  InferParams,
  inferParser,
  IntellisenseFor,
  Merge,
  OverwriteIfDefined,
  Parser,
  SchemaType,
  UnsetMarker,
} from 'src/utility'
import { z } from 'zod'
import { AbstractStage, BuilderDef, BuilderParams, validatorBaseStageConfig, validatorRunConfig } from './base'
import { StageConfig } from './stage'

async function processIt<
  Input,
  Output,
  IInput,
  IOutput,
  Config extends WrapConfig<Input, Output, IInput, IOutput> = WrapConfig<
    Input,
    Output,
    IInput,
    IOutput
  >,
>(
  this: Wrap<Input, Output, IInput, IOutput, Config>,
  input: Input,
): Promise<Output> {
  let prepared: IInput
  if (this.config.prepare) {
    prepared = await this.config.prepare(input)
  } else {
    prepared = input as unknown as IInput
  }
  const stageResult = await this.config.stage.exec(prepared)
  let result: Output
  if (this.config.finalize) {
    result = await this.config.finalize(input, stageResult)
  } else {
    result = stageResult as unknown as Output
  }
  return result
}

export class Wrap<
  Input,
  Output,
  IInput,
  IOutput,
  Config extends WrapConfig<Input, Output, IInput, IOutput> = WrapConfig<
    Input,
    Output,
    IInput,
    IOutput
  >,
> extends AbstractStage<Input, Output, Config> {
  constructor(cfg: Config) {
    super({ ...cfg, run: processIt })
    this.config = validatorWrapConfig(this.config).parse(this.config) as unknown as Config
  }
}

export type WrapPrepare<Input, IInput> = (
  ctx: Input,
) => Promise<IInput> | IInput

export type WrapFinalize<Input, Output, IOutput> = (
  ctx: Input,
  retCtx: IOutput,
) => Promise<Output> | Output

export interface WrapConfig<Input, Output, IInput, IOutput> extends StageConfig<Input, Output> {
  stage: AbstractStage<IInput, IOutput>
  prepare: WrapPrepare<Input, IInput>
  finalize: WrapFinalize<Input, Output, IOutput>
}

export function validatorWrapConfig<Input, Output, IInput, IOutput>(
  config: WrapConfig<Input, Output, IInput, IOutput>,
) {
  const output: z.ZodSchema = config?.output ? config.output : z.any()
  const input: z.ZodSchema = config?.input ? config.input : z.any()
  const iinput: z.ZodSchema = config?.stage.config?.input
    ? config?.stage.config?.input
    : z.any()
  const ioutput: z.ZodSchema = config?.stage.config?.output
    ? config?.stage.config?.output
    : z.any()
  return validatorBaseStageConfig
    .merge(validatorRunConfig(config))
    .merge(z.object({
      stage: z.instanceof(AbstractStage),
      prepare: z.function(z.tuple([input]), z.union([iinput.promise(), iinput])),
      finalize: z.function(z.tuple([input, ioutput]), z.union([output.promise(), output])),
    }))
}

export interface WrapDef<TConfig extends WrapConfig<any, any, any, any>> extends BuilderDef<TConfig> {
  stage: AbstractStage<any, any>
  prepare?: WrapPrepare<any, any>
  finalize?: WrapFinalize<any, any, any>
}

export interface WrapBuilder<TParams extends BuilderParams> {
  _def: BuilderDef<
    WrapConfig<ExtractInput<TParams>, ExtractOutput<TParams>, any, any>
  >
  build(): Wrap<
    ExtractInput<TParams>,
    ExtractOutput<TParams>,
    TParams['_wrapee_input'],
    TParams['_wrapee_output'],
    WrapConfig<ExtractInput<TParams>, ExtractOutput<TParams>, any, any>
  >
  input<$Parser extends Parser>(
    schema: SchemaType<TParams, $Parser, '_input', 'in'>,
  ): IntellisenseFor<
    'wrap',
    'input',
    WrapBuilder<
      Merge<
        InferParams<TParams>,
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
    'wrap',
    'output',
    WrapBuilder<
      Merge<
        InferParams<TParams>,
        {
          _output: OverwriteIfDefined<
            TParams['_output'],
            inferParser<$Parser>['in']
          >
        }
      >
    >
  >
  stage<RStage extends AbstractStage<any, any>>(
    stage: RStage,
  ): IntellisenseFor<
    'wrap',
    'stage',
    WrapBuilder<
      Merge<
        InferParams<TParams>,
        {
          _stage: OverwriteIfDefined<
            TParams['_stage'],
            ExtractStage<RStage>
          >
          _wrapee_input: OverwriteIfDefined<
            TParams['_wrapee_input'],
            ExtractStageInput<RStage>
          >
          _wrapee_output: OverwriteIfDefined<
            TParams['_wrapee_output'],
            ExtractStageOutput<RStage>
          >
        }
      >
    >
  >
  prepare(
    prepare: WrapPrepare<ExtractInput<TParams>, ExtractWrapeeInput<TParams>>,
  ): IntellisenseFor<
    'wrap',
    'prepare',
    WrapBuilder<
      InferParams<TParams>
    >
  >
  finalize(
    finalize: WrapFinalize<ExtractInput<TParams>, ExtractOutput<TParams>, ExtractWrapeeOutput<TParams>>,
  ): IntellisenseFor<
    'wrap',
    'finalize',
    WrapBuilder<
      InferParams<TParams>
    >
  >
}
export function wrap<TConfig extends WrapConfig<any, any, any, any>>(
  _def: Partial<WrapDef<TConfig>> = {},
): WrapBuilder<{
  _type: UnsetMarker
  _input: UnsetMarker
  _output: UnsetMarker
  _run: UnsetMarker
  _stage: UnsetMarker
  _usage: {}
  _wrapee_input: UnsetMarker
  _wrapee_output: UnsetMarker
}> {
  return {
    _def: _def as BuilderDef<TConfig>,
    input(input) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.input = input
      return wrap({
        ..._def,
        inputs: input,
      }) as any
    },
    output(output) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.output = output
      return wrap({
        ..._def,
        outputs: output,
      }) as any
    },
    stage(stage) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.stage = stage
      return wrap({
        ..._def,
        stage: stage,
      }) as any
    },
    build() {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      return new Wrap(_def.cfg) as any
    },
    prepare(fn) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.prepare = fn as any
      return wrap({
        ..._def,
        prepare: fn as any,
      }) as any
    },
    finalize(fn) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.finalize = fn as any
      return wrap({
        ..._def,
        finalize: fn as any,
      }) as any
    },
  }
}
