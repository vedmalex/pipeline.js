import z from 'zod'
import { AbstractStage, validatorBaseStageConfig, validatorRunConfig, WrapParams } from './base'
import { StageConfig } from './stage'
import {
  ErrorMessage,
  ExtractInput,
  ExtractOutput,
  ExtractStage,
  ExtractStageInput,
  ExtractStageOutput,
  inferParser,
  InferWrapParams,
  IntellisenseFor,
  Merge,
  OverwriteIfDefined,
  Parser,
  SchemaType,
} from './utility'

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
  { input }: { input: Input },
): Promise<Output> {
  let prepared: IInput
  if (this.config.prepare) {
    prepared = await this.config.prepare({ input })
  } else {
    prepared = input as unknown as IInput
  }
  const stageResult = await this.config.stage.exec({ input: prepared })
  let result: Output
  if (this.config.finalize) {
    result = await this.config.finalize({ input, data: stageResult })
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
  payload: { input: Input },
) => Promise<IInput> | IInput

export type WrapFinalize<Input, Output, IOutput> = (
  payload: { input: Input; data: IOutput },
) => Promise<Output> | Output

export interface WrapConfig<Input, Output, IInput, IOutput> extends StageConfig<Input, Output> {
  stage: AbstractStage<IInput, IOutput>
  prepare: WrapPrepare<Input, IInput>
  finalize: WrapFinalize<Input, Output, IOutput>
}

function validatorWrapConfig<Input, Output, IInput, IOutput>(
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
      prepare: z.function(
        z.tuple([
          z.object({
            input,
          }),
        ]),
        z.union([
          iinput.promise(),
          iinput,
        ]),
      ),
      finalize: z.function(
        z.tuple([
          z.object({
            input,
            data: ioutput,
          }),
        ]),
        z.union([
          output.promise(),
          output,
        ]),
      ),
    }))
}

export interface WrapBuilder<TParams extends WrapParams> {
  _def: WrapConfig<ExtractInput<TParams>, ExtractOutput<TParams>, any, any>
  build<
    Result extends Wrap<
      ExtractInput<TParams>,
      ExtractOutput<TParams>,
      ExtractStageInput<TParams['_stage']>,
      ExtractStageOutput<TParams['_stage']>
    >,
  >(): TParams['_prepare'] extends true ? TParams['_finalize'] extends true ? Result
    : ErrorMessage<'prepare MUST have finalize'>
    : Result

  input<$Parser extends Parser>(
    schema: SchemaType<TParams, $Parser, '_input', 'in'>,
  ): IntellisenseFor<
    'wrap',
    'input',
    WrapBuilder<
      Merge<
        InferWrapParams<TParams>,
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
        InferWrapParams<TParams>,
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
        InferWrapParams<TParams>,
        {
          _stage: OverwriteIfDefined<
            TParams['_stage'],
            ExtractStage<RStage>
          >
        }
      >
    >
  >
  prepare(
    prepare: WrapPrepare<ExtractInput<TParams>, ExtractStageInput<TParams['_stage']>>,
  ): IntellisenseFor<
    'wrap',
    'prepare',
    WrapBuilder<
      Merge<
        InferWrapParams<TParams>,
        {
          _prepare: OverwriteIfDefined<
            TParams['_prepare'],
            true
          >
        }
      >
    >
  >
  finalize(
    finalize: WrapFinalize<ExtractInput<TParams>, ExtractOutput<TParams>, ExtractStageOutput<TParams['_stage']>>,
  ): IntellisenseFor<
    'wrap',
    'finalize',
    WrapBuilder<
      Merge<
        InferWrapParams<TParams>,
        {
          _finalize: OverwriteIfDefined<
            TParams['_finalize'],
            true
          >
        }
      >
    >
  >
}

export function wrap(
  _def: WrapConfig<any, any, any, any> = {} as WrapConfig<any, any, any, any>,
): WrapBuilder<InferWrapParams<{ _type: 'wrap' }>> {
  return {
    _def,
    input(input) {
      return wrap({
        ..._def,
        input,
      })
    },
    output(output) {
      return wrap({
        ..._def,
        output,
      })
    },
    stage(stage) {
      return wrap({
        ..._def,
        stage,
      }) as any
    },
    build() {
      return new Wrap(_def) as any
    },
    prepare(prepare) {
      return wrap({
        ..._def,
        prepare,
      })
    },
    finalize(finalize) {
      return wrap({
        ..._def,
        finalize,
      })
    },
  }
}
