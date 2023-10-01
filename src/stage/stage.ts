import { z } from 'zod'

import { fromZodError } from 'zod-validation-error'
import { Context, OriginalObject } from './Context'
import { can_fix_error, ComplexError, CreateError } from './errors'
import { StageConfig } from './StageConfig'
import {
  AnyStage,
  CallbackFunction,
  isStageRun,
  LegacyCallback,
  makeCallback,
  makeCallbackArgs,
  Possible,
  RunPipelineFunction,
  StageRun,
  StageSymbol,
} from './types'
import { execute_callback } from './utils/execute_callback'
import { execute_custom_run } from './utils/execute_custom_run'
import { execute_rescue } from './utils/execute_rescue'

export class Stage<Input, Output, Config extends StageConfig<Input, Output> = StageConfig<Input, Output>>
  implements AnyStage<Input, Output> {
  public get config(): Config {
    return this._config as Config
  }
  [StageSymbol]: boolean
  protected _config!: Config
  constructor(config: Config)
  constructor(config: unknown) {
    this[StageSymbol] = true
    if (typeof config === 'object' && config !== null) {
      this._config = config as Config
    } else {
      throw new Error('arguments Error')
    }
  }

  public get name() {
    return this._config.name ?? ''
  }

  // может быть вызван как Promise
  // сделать все дубликаты и проверки методов для работы с промисами
  public execute(context: Input): Promise<Output>
  public execute(context: Input, callback: LegacyCallback<Output>): void
  public execute(err: unknown, context: Input, callback: LegacyCallback<Output>): void
  public execute(
    _err?: unknown,
    _context?: unknown,
    _callback?: unknown,
  ): void | Promise<Output> {
    // discover arguments
    let err: Possible<ComplexError>
    let not_ensured_context: Input
    let __callback: Possible<CallbackFunction<Input, Output>> = undefined

    if (arguments.length == 1) {
      not_ensured_context = _err as Input
      // promise
    } else if (arguments.length == 2) {
      if (typeof _context == 'function') {
        // callback
        not_ensured_context = _err as Input
        err = undefined
        __callback = makeCallback(_context as LegacyCallback<Output>)
      } else {
        // promise
        err = _err as ComplexError
        not_ensured_context = _context as Input
      }
    } else {
      // callback
      err = _err as ComplexError
      not_ensured_context = _context as Input
      __callback = makeCallback(_callback as LegacyCallback<Output>)
    }

    return this.exec(err, not_ensured_context, __callback!)
  }
  // new API for execution
  public exec(context: Input): Promise<Output>
  public exec(context: Input, callback: CallbackFunction<Input, Output>): void
  public exec(err: unknown, context: Input, callback: CallbackFunction<Input, Output>): void
  public exec(
    _err?: unknown,
    _context?: unknown,
    _callback?: unknown,
  ): void | Promise<Output> {
    // discover arguments
    let err: Possible<ComplexError>
    let not_ensured_context: Input
    let __callback: Possible<CallbackFunction<Input, Output>> = undefined

    if (arguments.length == 1) {
      not_ensured_context = _err as Input
      // promise
    } else if (arguments.length == 2) {
      if (typeof _context == 'function') {
        // callback
        not_ensured_context = _err as Input
        err = undefined
        __callback = _context as CallbackFunction<Input, Output>
      } else {
        // promise
        err = _err as ComplexError
        not_ensured_context = _context as Input
      }
    } else {
      // callback
      err = _err as ComplexError
      not_ensured_context = _context as Input
      __callback = _callback as CallbackFunction<Input, Output>
    }

    if (!this.run) {
      this.run = this.compile()
    } else if (!this.config?.run) {
      // legacy run
      if (!isStageRun(this.run)) {
        var legacy = this.run

        this.run = execute_custom_run<Input, Output>(legacy as RunPipelineFunction<Input, Output>)
      }
    }

    const stageToRun = this.run?.bind(this)

    const input_is_context = Context.isProxy(not_ensured_context)
    const isProxible = input_is_context || (not_ensured_context && typeof not_ensured_context === 'object')

    let context = isProxible ? Context.ensure(not_ensured_context) : not_ensured_context
    if (isProxible) {
      context[OriginalObject] = true
    }
    // выполнить валидацию результата сразу же перед вызовом последнего значения
    if (!__callback) {
      return new Promise<Output>((res, rej) => {
        this.execute(err, context, (err, ctx) => {
          if (err) {
            rej(err)
          } else {
            if (input_is_context) {
              res(ctx ?? context as unknown as Output)
            } else {
              if (Context.isProxy(ctx)) {
                res(ctx.original as Output)
              } else {
                res(ctx as unknown as Output)
              }
            }
          }
        })
      })
    } else {
      const back = makeCallback((err, _ctx) => {
        if (input_is_context) {
          __callback?.(makeCallbackArgs(err, _ctx))
        } else {
          if (Context.isProxy<Output>(_ctx)) {
            __callback?.(makeCallbackArgs(err, _ctx.original))
          } else {
            __callback?.(makeCallbackArgs(err, _ctx))
          }
        }
      })
      const successRescue = (ret: unknown) => {
        if (this._config.output) {
          this.validate(
            this._config.output,
            ret ?? context,
            makeCallback((err_, ctx) => {
              if (err_) {
                this.rescue(err_, ctx ?? context, fail, successRescue)
              } else {
                back(makeCallbackArgs(err, ctx ?? context as unknown as Output))
              }
            }),
          )
        } else {
          success(ret)
        }
      }
      const success = (ret: unknown) => back(makeCallbackArgs(undefined, ret ?? context))
      const fail = (err: unknown) => back(makeCallbackArgs(err, context as unknown as Output))

      const callback = makeCallback((err?, _ctx?: Output) => {
        if (err) {
          this.rescue(err, _ctx ?? context, fail, successRescue)
        } else {
          if (this._config.output) {
            this.validate(
              this._config.output,
              _ctx ?? context,
              makeCallback((err_, ctx) => {
                if (err_) {
                  this.rescue(err_, ctx ?? context, fail, successRescue)
                } else {
                  back(makeCallbackArgs(err, ctx ?? context as unknown as Output))
                }
              }),
            )
          } else {
            back(makeCallbackArgs(err, _ctx ?? context as unknown as Output))
          }
        }
      })

      if (err && this._config.run && !can_fix_error(this._config.run)) {
        this.rescue(err, context, fail, successRescue)
      } else {
        if (this._config.input) {
          this.validate<Input>(
            this._config.input,
            context,
            makeCallback((err_, ctx) => {
              this.runStageMethod(err, err_, ctx, context, stageToRun, callback)
            }),
          )
        } else {
          stageToRun(undefined, context, callback)
        }
      }
    }
  }

  protected runStageMethod(
    err_: unknown,
    err: unknown,
    ctx: Input | undefined,
    context: Input,
    stageToRun: StageRun<any, Output>,
    callback: CallbackFunction<Input, Output>,
  ) {
    if (err || err_) {
      if (this.config.run && !can_fix_error(this.config.run)) {
        this.rescue(
          CreateError([err, err_] as Array<Error>),
          ctx ?? context,
          err => callback(makeCallbackArgs(err)),
          rescuedContext => {
            // ошибка обработана все хорошо, продолжаем
            stageToRun(undefined, rescuedContext, callback)
          },
        )
      } else {
        // обработка ошибок может происходить внутри функции
        stageToRun(CreateError([err, err_] as Array<Error>), ctx ?? context, callback)
      }
    } else {
      stageToRun(undefined, ctx ?? context, callback)
    }
  }

  protected stage(err: unknown, context: Input, callback: CallbackFunction<Input, Output>) {
    const back = callback
    const sucess = (ret: unknown) => back(makeCallbackArgs(undefined, ret ?? context))
    const fail = (err: unknown) => back(makeCallbackArgs(err, context))
    if (this._config.run) {
      if (context) {
        ;(execute_callback<Input, Output>).call(this, err, this._config.run, context, callback)
      } else {
        // возвращаем управление
        callback(makeCallbackArgs(err))
      }
    } else {
      const retErr: Array<any> = [new Error('reports: run is not a function')]
      if (err) {
        retErr.push(err)
      }
      this.rescue(CreateError(retErr), context, fail, sucess)
    }
  }

  // to be overridden by compile
  protected run?: StageRun<Input, Output>
  /**
   * Compile the pipeline.
   * @param rebuild Whether to rebuild the pipeline.
   * @returns The compiled pipeline.
   */
  protected compile(rebuild: boolean = false): StageRun<Input, Output> {
    let res: StageRun<Input, Output>
    if (this.config.compile) {
      res = this.config.compile.call(this, rebuild)
    } else if (!this.run || rebuild) {
      res = this.stage
    } else {
      if (isStageRun<Input, Output>(this.run)) {
        res = this.run
      } else {
        res = execute_custom_run(this.run)
      }
    }
    return res
  }

  // объединение ошибок сделать
  // посмотреть что нужно сделать чтобы вызвать ошибку правильно!!!
  // в начале выполнения важен правильный callback, возможно без контекста
  // в конце важен и контекст ошибки? или не важен
  protected rescue(
    _err: unknown,
    context: unknown,
    fail: (err: unknown) => void,
    success: (ctx: unknown) => void,
  ) {
    let err: Possible<Error>

    if (_err) {
      if (!(_err instanceof Error)) {
        err = _err as Error
      } else {
        err = _err
      }
    } else {
      err = null
    }

    if (err && this._config.rescue) {
      execute_rescue(
        this._config.rescue,
        err,
        context,
        makeCallback(_err => {
          // здесь может быть исправлена ошибка, и контекст передается дальше на выполнение
          if (_err) {
            fail(_err)
          } else {
            success(context)
          }
        }),
      )
    } else {
      // отправить ошибку дальше
      // окончателная ошибка и выходим из выполнения
      if (err) {
        fail(err)
      } else {
        success(context)
      }
    }
  }

  protected rescue_async(
    _err: unknown,
    context: unknown,
  ): Promise<[unknown, unknown]> {
    return new Promise(resolve => {
      this.rescue(_err, context, err => {
        resolve([err, context])
      }, res => {
        resolve([undefined, res ?? context])
      })
    })
  }

  protected validate<T>(
    validate: z.ZodType<T>,
    context: unknown,
    callback: CallbackFunction<Input, T>,
  ) {
    validate.safeParseAsync(context)
      .then(result => {
        if (!result.success) {
          callback(makeCallbackArgs(fromZodError(result?.error), context as T))
        } else {
          callback(makeCallbackArgs(undefined, context as T))
        }
      })
  }
}
