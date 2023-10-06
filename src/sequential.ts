import { z } from 'zod'
import { AbstractStage, BuilderDef, SequentialParams, validatorBaseStageConfig, validatorRunConfig } from './base'
import { CreateError } from './error'
import { ParallelError } from './error'
import { StageConfig } from './stage'
import {
  ErrorMessage,
  ExtractInput,
  ExtractOutput,
  ExtractStage,
  ExtractStageInput,
  ExtractStageOutput,
  inferParser,
  InferSequentialParams,
  IntellisenseFor,
  Merge,
  OverwriteIfDefined,
  Parser,
  SchemaType,
} from './utility'

async function sequentialProcessIt<
  Input,
  Output,
  IInput,
  IOutput,
  Config extends SequentialConfig<Input, Output, IInput, IOutput> = SequentialConfig<
    Input,
    Output,
    IInput,
    IOutput
  >,
>(
  this: Sequential<Input, Output, IInput, IOutput, Config>,
  input: Input,
): Promise<Output> {
  let prepared: Array<IInput>
  if (this.config.split) {
    prepared = await this.config.split(input)
  } else if (Array.isArray(input)) {
    prepared = input as unknown as Array<IInput>
  } else {
    throw new Error('input must be Array if you not use split')
  }

  let iresult: Array<IOutput> = []
  for (let i = 0; i < prepared.length; i++) {
    const item = prepared[i]
    const stageResult = await this.config.stage.exec(item)
    iresult.push(stageResult)
  }

  let result: Output
  if (this.config.combine) {
    result = await this.config.combine(input, iresult)
  } else {
    result = iresult as unknown as Output
  }
  return result
}

async function parallelProcessIt<
  Input,
  Output,
  IInput,
  IOutput,
  Config extends SequentialConfig<Input, Output, IInput, IOutput> = SequentialConfig<
    Input,
    Output,
    IInput,
    IOutput
  >,
>(
  this: Sequential<Input, Output, IInput, IOutput, Config>,
  input: Input,
): Promise<Output> {
  let prepared: Array<IInput>
  if (this.config.split) {
    prepared = await this.config.split(input)
  } else if (Array.isArray(input)) {
    prepared = input as unknown as Array<IInput>
  } else {
    throw new Error('input must be Array if you not use split')
  }

  const presult = await Promise.allSettled(prepared.map(item => this.config.stage.exec(item)))

  let errors: Array<any> = []
  let iresult: Array<IOutput> = []

  for (let i = 0; i < presult.length; i++) {
    const item = presult[i]
    if (item.status == 'fulfilled') {
      iresult.push(item.value)
    } else {
      errors.push(
        new ParallelError({
          index: i,
          ctx: prepared[i],
          err: item.reason,
        }),
      )
    }
  }
  if (errors.length > 0) {
    throw CreateError(errors)
  }
  let result: Output
  if (this.config.combine) {
    result = await this.config.combine(input, iresult)
  } else {
    result = iresult as unknown as Output
  }
  return result
}

export class Sequential<
  Input,
  Output,
  IInput,
  IOutput,
  Config extends SequentialConfig<Input, Output, IInput, IOutput> = SequentialConfig<
    Input,
    Output,
    IInput,
    IOutput
  >,
> extends AbstractStage<Input, Output, Config> {
  constructor(cfg: Config) {
    super({ ...cfg, run: cfg.serial ? sequentialProcessIt : parallelProcessIt })
    this.config = validatorSequentialConfig(this.config).parse(this.config) as unknown as Config
  }
}

export type SequentialSplit<Input, IInput> = (
  ctx: Input,
) => Promise<Array<IInput>> | Array<IInput>

export type SequentialCombine<Input, Output, IOutput> = (
  ctx: Input,
  retCtx: Array<IOutput>,
) => Promise<Output> | Output

export interface SequentialConfig<Input, Output, IInput, IOutput> extends StageConfig<Input, Output> {
  serial?: boolean
  stage: AbstractStage<IInput, IOutput>
  split?: SequentialSplit<Input, IInput>
  combine?: SequentialCombine<Input, Output, IOutput>
}

export function validatorSequentialConfig<Input, Output, IInput, IOutput>(
  config: SequentialConfig<Input, Output, IInput, IOutput>,
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
      serial: z.boolean().optional(),
      stage: z.instanceof(AbstractStage),
      split: z.function(z.tuple([input]), z.union([z.array(iinput).promise(), z.array(iinput)])).optional(),
      combine: z.function(z.tuple([input, z.array(ioutput)]), z.union([output.promise(), output])).optional(),
    }))
}

export interface SequentialDef<TConfig extends SequentialConfig<any, any, any, any>> extends BuilderDef<TConfig> {
  serial?: boolean
  stage: AbstractStage<any, any>
  split?: SequentialSplit<any, any>
  combine?: SequentialCombine<any, any, any>
}

export interface SequentialBuilder<TParams extends SequentialParams> {
  _def: BuilderDef<
    SequentialConfig<ExtractInput<TParams>, ExtractOutput<TParams>, any, any>
  >
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
  build<
    Result extends Sequential<
      ExtractInput<TParams>,
      ExtractOutput<TParams>,
      ExtractStageInput<TParams['_stage']>,
      ExtractStageOutput<TParams['_stage']>
    >,
  >(): TParams['_split'] extends true ? TParams['_combine'] extends true ? Result
    : ErrorMessage<'prepare MUST have finalize'>
    : Result

  input<$Parser extends Parser>(
    schema: SchemaType<TParams, $Parser, '_input', 'in'>,
  ): IntellisenseFor<
    'sequential',
    'input',
    SequentialBuilder<
      Merge<
        InferSequentialParams<TParams>,
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
    'sequential',
    'output',
    SequentialBuilder<
      Merge<
        InferSequentialParams<TParams>,
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
  split(
    prepare: SequentialSplit<ExtractInput<TParams>, ExtractStageInput<TParams['_stage']>>,
  ): IntellisenseFor<
    'sequential',
    'split',
    SequentialBuilder<
      Merge<
        InferSequentialParams<TParams>,
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
    finalize: SequentialCombine<ExtractInput<TParams>, ExtractOutput<TParams>, ExtractStageOutput<TParams['_stage']>>,
  ): IntellisenseFor<
    'sequential',
    'combine',
    SequentialBuilder<
      Merge<
        InferSequentialParams<TParams>,
        {
          _finalize: OverwriteIfDefined<
            TParams['_combine'],
            true
          >
        }
      >
    >
  >
}

export function sequential<TConfig extends SequentialConfig<any, any, any, any>>(
  _def: Partial<SequentialDef<TConfig>> = {},
): SequentialBuilder<InferSequentialParams<{ _type: 'sequential' }>> {
  return {
    _def: _def as BuilderDef<TConfig>,
    serial() {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.serial = true
      return sequential({
        ..._def,
        serial: true,
      }) as any
    },
    input(input) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.input = input as any
      return sequential({
        ..._def,
        inputs: input as any,
      }) as any
    },
    output(output) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.output = output as any
      return sequential({
        ..._def,
        outputs: output as any,
      }) as any
    },
    stage(stage) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.stage = stage
      return sequential({
        ..._def,
        stage: stage,
      }) as any
    },
    build() {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      return new Sequential(_def.cfg) as any
    },
    split(fn) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.split = fn as any
      return sequential({
        ..._def,
        split: fn as any,
      }) as any
    },
    combine(fn) {
      if (!_def.cfg) {
        _def.cfg = {} as TConfig
      }
      _def.cfg.combine = fn as any
      return sequential({
        ..._def,
        combine: fn as any,
      }) as any
    },
  }
}
