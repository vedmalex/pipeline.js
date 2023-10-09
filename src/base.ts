import z from 'zod'
import { fromZodError } from 'zod-validation-error'
import { // включить тип для вычисления параметра
  makeCallbackArgs,
} from './CallbackFunction'

import { GetStage } from './builder'
import { ERROR } from './error'
import { InferBuilderParams, IntellisenseFor, Merge, OverwriteIfDefined, StageType, UnsetMarker } from './utility'

// включить тип для вычисления параметра

export type BaseStageConfig<Input, Output> = {
  input?: z.ZodType<Input>
  output?: z.ZodType<Output>
}

export type FnRun<Input, Output> = (payload: { input: Input }) => Promise<Output> | Output

export type RunDef<Fn extends FnRun<any, any>> = Fn extends FnRun<infer Input, infer Output> ? {
    _input: Input
    _output: Output
  }
  : {
    _input: UnsetMarker
    _output: UnsetMarker
  }

export type RunConfig<Input, Output> = {
  run: FnRun<Input, Output>
}

export const validatorBaseStageConfig = z.object({
  input: z.instanceof(z.ZodType).optional(),
  output: z.instanceof(z.ZodType).optional(),
})

export function validatorRun<Input, Output>(_input?: z.ZodSchema, _output?: z.ZodSchema) {
  const input: z.ZodSchema = _input ? _input : z.any()
  const output: z.ZodSchema = _output ? _output : input
  return z.function(z.tuple([z.object({ input })]), z.union([output.promise(), output]))
}

export function validatorRunConfig<Input, Output>(config?: BaseStageConfig<Input, Output>) {
  const input: z.ZodSchema = config?.input ? config.input : z.any()
  const output: z.ZodSchema = config?.output ? config.output : input
  return z.object({
    run: validatorRun(input, output),
  })
}

export class AbstractStage<
  Input,
  Output,
  TConfig extends BaseStageConfig<Input, Output> = BaseStageConfig<Input, Output>,
> {
  private _config: BaseStageConfig<Input, Output> & RunConfig<Input, Output>
  get config(): TConfig {
    return this._config as unknown as TConfig
  }
  protected set config(config: TConfig) {
    this._config = config as any
  }
  protected get run() {
    return this._config.run
  }
  protected set run(run: FnRun<Input, Output>) {
    this._config.run = run
  }
  constructor(config: BaseStageConfig<Input, Output> & RunConfig<Input, Output>) {
    if (typeof config === 'object' && config !== null) {
      this._config = config
      this._config.run = this._config.run.bind(this)
    } else {
      throw new Error(ERROR.argements_error)
    }
    this.exec = this.exec.bind(this)
  }

  // может быть вызван как Promise
  // сделать все дубликаты и проверки методов для работы с промисами
  public async exec({ input }: { input: Input }): Promise<Output> {
    if (this._config.input) {
      const validateResult = await this.validate(this._config.input, input)
      if (validateResult.result === 'failure') {
        throw validateResult.reason
      }
    }

    const result = await validatorRun(this.config.input, this.config.output).parse(this._config.run)({ input })

    if (this._config.output) {
      const validateResult = await this.validate(this._config.output, result)
      if (validateResult.result === 'failure') {
        throw validateResult.reason
      }
    }
    return result
  }

  public async execute(input: Input) {
    return this.exec({ input })
  }

  protected async validate<T>(
    validate: z.ZodType<T>,
    context: unknown,
  ) {
    const result = await validate.safeParseAsync(context)
    if (!result.success) {
      return makeCallbackArgs(fromZodError(result?.error), context as T)
    } else {
      return makeCallbackArgs(undefined, context as T)
    }
  }
}

export interface BuilderParams {
  _type: unknown
}

export interface WithInputParams {
  _input: unknown
}

export interface WithInputOutputParams extends WithInputParams {
  _output: unknown
}

export interface WithStageParams {
  _stage: unknown
}

export interface StageParams extends BuilderParams, WithInputOutputParams {
  _run: unknown
}

export interface RescueParams extends BuilderParams, WithInputOutputParams, WithStageParams {
}

export interface WrapParams extends BuilderParams, WithInputOutputParams, WithStageParams {
  _prepare: unknown
  _finalize: unknown
}

export interface TimeoutParams extends BuilderParams, WithInputOutputParams, WithStageParams {
  _timeout: unknown
}
export interface IfElseParams extends BuilderParams, WithInputOutputParams, WithStageParams {
  _if: unknown
  _then: unknown
  _else: unknown
}

export interface RetryOnErrorParams extends BuilderParams, WithInputOutputParams, WithStageParams {
  _retry: unknown
  _backup: unknown
  _restore: unknown
  _storage: unknown
}

export interface DoWhileParams extends BuilderParams, WithInputOutputParams, WithStageParams {
  _step: unknown
  _combine: unknown
}

export interface MultiWaySwitchParams extends BuilderParams, WithInputOutputParams {
  _cases: unknown
}

export interface MultiWaySwitchCaseParams extends BuilderParams, WithInputOutputParams, WithStageParams {
  _evaluate: unknown
}

export interface Params extends BuilderParams, WithInputOutputParams, WithStageParams {
  _prepare: unknown
  _finalize: unknown
}

export interface PipelineParams extends BuilderParams, WithInputOutputParams {
}

export interface SequentialParams extends BuilderParams, WithInputOutputParams, WithStageParams {
  _serial: unknown
}

export interface Builder<TParams extends BuilderParams> {
  type<T extends StageType>(type: T): IntellisenseFor<
    T,
    'start',
    GetStage<
      T,
      Merge<
        InferBuilderParams<TParams>,
        {
          _type: OverwriteIfDefined<
            TParams['_type'],
            T
          >
        }
      >
    >
  >
}