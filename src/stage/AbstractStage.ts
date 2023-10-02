import { z } from 'zod'

import { fromZodError } from 'zod-validation-error'
import { BaseStageConfig, Run, RunConfig, validatorRun } from './StageConfig'
import { makeCallbackArgs } from './types'

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
  protected set run(run: Run<Input, Output>) {
    this._config.run = run
  }
  constructor(config: BaseStageConfig<Input, Output> & RunConfig<Input, Output>) {
    if (typeof config === 'object' && config !== null) {
      this._config = config
      this._config.run = this._config.run.bind(this)
    } else {
      throw new Error('arguments Error')
    }
    this.exec = this.exec.bind(this)
  }

  // может быть вызван как Promise
  // сделать все дубликаты и проверки методов для работы с промисами
  public async exec(input: Input): Promise<Output> {
    if (this._config.input) {
      const validateResult = await this.validate(this._config.input, input)
      if (validateResult.result === 'failure') {
        throw validateResult.reason
      }
    }

    const result = await validatorRun(this.config.input, this.config.output).parse(this._config.run)(input)

    if (this._config.output) {
      const validateResult = await this.validate(this._config.output, result)
      if (validateResult.result === 'failure') {
        throw validateResult.reason
      }
    }
    return result
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
