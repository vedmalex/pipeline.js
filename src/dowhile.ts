import z from 'zod'
import { AbstractStage, BaseStageConfig, DoWhileParams, validatorBaseStageConfig, validatorRunConfig } from './base'
import {
  ErrorMessage,
  ExtractInput,
  ExtractOutput,
  ExtractStage,
  ExtractStageInput,
  ExtractStageOutput,
  InferDoWhileParams,
  inferParser,
  IntellisenseFor,
  Merge,
  OverwriteIfDefined,
  Parser,
  SchemaType,
} from './utility'

async function processIt<Input, Output, IInput, IOutput>(
  this: DoWhile<Input, Output, IInput, IOutput>,
  { input }: { input: Input },
): Promise<Output> {
  let iteration = 0
  let result = input as unknown as Output

  do {
    let _input = this.config.step ? await this.config.step({ input, iteration }) : input as unknown as IInput
    let _result = await this.config.do.exec({ input: _input })

    result = await this.config.combine({ input, result: _result, output: result, iteration })
    iteration += 1
  } while (this.config.while({ input, iteration }))

  return result
}
export class DoWhile<
  Input,
  Output,
  IInput,
  IOutput,
  Config extends DoWhileConfig<Input, Output, IInput, IOutput> = DoWhileConfig<Input, Output, IInput, IOutput>,
> extends AbstractStage<Input, Input, Config> {
  constructor(cfg: Config) {
    super({ ...cfg, run: processIt })
    this.config = validatorDoWhileConfig(this.config).parse(this.config) as unknown as Config
  }
}

export type DowhileStep<Input, IInput> = (payload: { input: Input; iteration: number }) => IInput | Promise<IInput>
export type DoWhileCombine<Input, Output, IOutput> = (
  payload: { input: Input; output: Output; result: IOutput; iteration: number },
) => Output | Promise<Output>
export type DoWhileCondition<Input> = (payload: { input: Input; iteration: number }) => boolean | Promise<boolean>

export interface DoWhileConfig<Input, Output, IInput, IOutput> extends BaseStageConfig<Input, Input> {
  while: DoWhileCondition<Input>
  do: AbstractStage<IInput, IOutput>
  step: DowhileStep<Input, IInput>
  combine: DoWhileCombine<Input, Output, IOutput>
}

function validatorDoWhileConfig<Input, Output, IInput, IOutput>(
  config: DoWhileConfig<Input, Output, IInput, IOutput>,
) {
  const input: z.ZodSchema = config?.input ? config.input : z.any()
  const output: z.ZodSchema = config?.output ? config.output : z.any()
  const iinput: z.ZodSchema = config?.do.config?.input
    ? config?.do.config?.input
    : z.any()
  const ioutput: z.ZodSchema = config?.do.config?.output
    ? config?.do.config?.output
    : z.any()
  return validatorBaseStageConfig
    .merge(validatorRunConfig(config))
    .merge(z.object({
      while: z.function(
        z.tuple([z.object({
          input,
          iteration: z.number(),
        })]),
        z.union([z.boolean().promise(), z.boolean()]),
      ),
      do: z.instanceof(AbstractStage),
      step: z.function(z.tuple([z.object({ input, iteration: z.number() })]), z.union([iinput.promise(), iinput])),
      combine: z.function(
        z.tuple([z.object({
          input,
          output,
          result: ioutput,
          iteration: z.number(),
        })]),
        z.union([input.promise(), input]),
      ),
    }))
}

export interface DoWhileBuilder<TParams extends DoWhileParams> {
  _def: DoWhileConfig<ExtractInput<TParams>, ExtractOutput<TParams>, any, any>
  build<
    Result extends DoWhile<
      ExtractInput<TParams>,
      ExtractStageInput<TParams['_stage']>,
      ExtractStageOutput<TParams['_stage']>,
      DoWhileConfig<ExtractInput<TParams>, ExtractOutput<TParams>, any, any>
    >,
  >(): TParams['_step'] extends true ? TParams['_combine'] extends true ? Result
    : ErrorMessage<'prepare MUST have finalize'>
    : Result

  input<$Parser extends Parser>(
    schema: SchemaType<TParams, $Parser, '_input', 'in'>,
  ): IntellisenseFor<
    'dowhile',
    'input',
    DoWhileBuilder<
      Merge<
        InferDoWhileParams<TParams>,
        {
          _input: OverwriteIfDefined<
            TParams['_input'],
            inferParser<$Parser>['in']
          >
          _output: OverwriteIfDefined<
            TParams['_output'],
            inferParser<$Parser>['in']
          >
        }
      >
    >
  >
  output<$Parser extends Parser>(
    schema: SchemaType<TParams, $Parser, '_input', 'in'>,
  ): IntellisenseFor<
    'dowhile',
    'input',
    DoWhileBuilder<
      Merge<
        InferDoWhileParams<TParams>,
        {
          _output: OverwriteIfDefined<
            TParams['_output'],
            inferParser<$Parser>['in']
          >
        }
      >
    >
  >
  while(
    reachEnd: DoWhileCondition<ExtractInput<TParams>>,
  ): IntellisenseFor<
    'dowhile',
    'while',
    DoWhileBuilder<
      InferDoWhileParams<TParams>
    >
  >
  do<RStage extends AbstractStage<any, any>>(
    stage: RStage,
  ): IntellisenseFor<
    'dowhile',
    'do',
    DoWhileBuilder<
      Merge<
        InferDoWhileParams<TParams>,
        {
          _stage: OverwriteIfDefined<
            TParams['_stage'],
            ExtractStage<RStage>
          >
        }
      >
    >
  >
  step(
    split: DowhileStep<ExtractInput<TParams>, ExtractStageInput<TParams['_stage']>>,
  ): IntellisenseFor<
    'dowhile',
    'step',
    DoWhileBuilder<
      Merge<
        InferDoWhileParams<TParams>,
        {
          _prepare: OverwriteIfDefined<
            TParams['_step'],
            true
          >
        }
      >
    >
  >
  combine(
    combine: DoWhileCombine<ExtractInput<TParams>, ExtractOutput<TParams>, ExtractStageOutput<TParams['_stage']>>,
  ): IntellisenseFor<
    'dowhile',
    'combine',
    DoWhileBuilder<
      Merge<
        InferDoWhileParams<TParams>,
        {
          _combine: OverwriteIfDefined<
            TParams['_combine'],
            true
          >
        }
      >
    >
  >
}

export function dowhile(
  _def: DoWhileConfig<any, any, any, any> = {} as DoWhileConfig<any, any, any, any>,
): DoWhileBuilder<InferDoWhileParams<{ _type: 'dowhile' }>> {
  return {
    _def,
    input(input) {
      return dowhile({
        ..._def,
        input,
      })
    },
    output(output) {
      return dowhile({
        ..._def,
        output,
      })
    },
    do(stage) {
      return dowhile({
        ..._def,
        do: stage,
      }) as any
    },
    build() {
      return new DoWhile(_def) as any
    },
    step(step) {
      return dowhile({
        ..._def,
        step,
      })
    },
    combine(combine) {
      return dowhile({
        ..._def,
        combine,
      })
    },
    while(condition) {
      return dowhile({ ..._def, while: condition })
    },
  }
}
