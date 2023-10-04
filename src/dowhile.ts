import { z } from 'zod'
import {
  AbstractStage,
  BaseStageConfig,
  BuilderDef,
  DoWhileParams,
  validatorBaseStageConfig,
  validatorRunConfig,
} from './base'
import {
  ErrorMessage,
  ExtractInput,
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

async function processIt<Input, IInput, IOutput>(
  this: DoWhile<Input, IInput, IOutput>,
  input: Input,
): Promise<Input> {
  let iter = 0
  let result = input
  do {
    let _input = this.config.split ? await this.config.split(input, iter) : input as unknown as IInput
    let _result = await this.config.stage.exec(_input)

    result = this.config.combine ? await this.config.combine(input, _result, iter) : _result as unknown as Input
    iter += 1
  } while (!this.config.reachEnd(input, iter))

  return result
}
export class DoWhile<
  Input,
  IInput,
  IOutput,
  Config extends DoWhileConfig<Input, IInput, IOutput> = DoWhileConfig<Input, IInput, IOutput>,
> extends AbstractStage<Input, Input, Config> {
  constructor(cfg: Config) {
    super({ ...cfg, run: processIt })
    this.config = validatorDoWhileConfig(this.config).parse(this.config) as unknown as Config
  }
}

export type DowhileSplit<Input, IInput> = (input: Input, iter: number) => IInput | Promise<IInput>
export type DoWhileCombine<Input, IOutput> = (input: Input, result: IOutput, iter: number) => Input | Promise<Input>
export type DoWhileReachEnd<Input> = (ctx: Input, iter: number) => boolean | Promise<boolean>

export interface DoWhileConfig<Input, IInput, IOutput> extends BaseStageConfig<Input, Input> {
  stage: AbstractStage<IInput, IOutput>
  split?: DowhileSplit<Input, IInput>
  combine?: DoWhileCombine<Input, IOutput>
  reachEnd: DoWhileReachEnd<Input>
}

export function validatorDoWhileConfig<Input, IInput, IOutput>(
  config: DoWhileConfig<Input, IInput, IOutput>,
) {
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
      split: z.function(z.tuple([input, z.number()]), z.union([iinput.promise(), iinput])).optional(),
      combine: z.function(z.tuple([input, ioutput, z.number()]), z.union([input.promise(), input])).optional(),
      reachEnd: z.function(z.tuple([input, z.number()]), z.union([z.boolean().promise(), z.boolean()])),
    }))
}

export interface DoWhileDef<TConfig extends DoWhileConfig<any, any, any>> extends BuilderDef<TConfig> {
  stage: AbstractStage<any, any>
  split?: DowhileSplit<any, any>
  combine?: DoWhileCombine<any, any>
  reachEnd: DoWhileReachEnd<any>
}

export interface DoWhileBuilder<TParams extends DoWhileParams> {
  _def: BuilderDef<
    DoWhileConfig<ExtractInput<TParams>, any, any>
  >
  build<
    Result extends DoWhile<
      ExtractInput<TParams>,
      ExtractStageInput<TParams['_stage']>,
      ExtractStageOutput<TParams['_stage']>,
      DoWhileConfig<ExtractInput<TParams>, any, any>
    >,
  >(): TParams['_split'] extends true ? TParams['_combine'] extends true ? Result
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
  stage<RStage extends AbstractStage<any, any>>(
    stage: RStage,
  ): IntellisenseFor<
    'dowhile',
    'stage',
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
  split(
    split: DowhileSplit<ExtractInput<TParams>, ExtractStageInput<TParams['_stage']>>,
  ): IntellisenseFor<
    'dowhile',
    'split',
    DoWhileBuilder<
      Merge<
        InferDoWhileParams<TParams>,
        {
          _prepare: OverwriteIfDefined<
            TParams['_split'],
            true
          >
        }
      >
    >
  >
  combine(
    combine: DoWhileCombine<ExtractInput<TParams>, ExtractStageOutput<TParams['_stage']>>,
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
  reachEnd(
    reachEnd: DoWhileReachEnd<ExtractInput<TParams>>,
  ): IntellisenseFor<
    'dowhile',
    'reachEnd',
    DoWhileBuilder<
      Merge<
        InferDoWhileParams<TParams>,
        {
          _combine: OverwriteIfDefined<
            TParams['_reachEnd'],
            true
          >
        }
      >
    >
  >
}

export function dowhile<TConfig extends DoWhileConfig<any, any, any>>(
  _def: Partial<DoWhileDef<TConfig>> = {},
): DoWhileBuilder<InferDoWhileParams<{ _type: 'dowhile' }>> {
  return {
    _def: _def as BuilderDef<TConfig>,
    input(input) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.input = input as any
      return dowhile({
        ..._def,
        inputs: input as any,
      }) as any
    },
    stage(stage) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.stage = stage
      return dowhile({
        ..._def,
        stage: stage,
      }) as any
    },
    build() {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      return new DoWhile(_def.cfg) as any
    },
    split(split) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.split = split as any
      return dowhile({
        ..._def,
        split: split as any,
      }) as any
    },
    combine(combine) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.combine = combine as any
      return dowhile({
        ..._def,
        combine: combine as any,
      }) as any
    },
    reachEnd(reachEnd) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.reachEnd = reachEnd as any
      return dowhile({
        ..._def,
        reachEnd: reachEnd as any,
      }) as any
    },
  }
}
