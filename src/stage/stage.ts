import { z } from 'zod'

import { fromZodError } from 'zod-validation-error'
import { Context, OriginalObject } from './Context'
import { can_fix_error, ComplexError, CreateError } from './errors'
import { getStageConfig, isAnyStage, StageSymbol } from './getStageConfig'
import { StageConfig } from './StageConfig'
import { AllowedStage, AnyStage, CallbackFunction, isStageRun, Possible, RunPipelineFunction, StageRun } from './types'
import { execute_callback } from './utils/execute_callback'
import { execute_custom_run } from './utils/execute_custom_run'
import { execute_rescue } from './utils/execute_rescue'

export class Stage<R, C extends StageConfig<R> = StageConfig<R>> implements AnyStage<R> {
  public get config(): C {
    return this._config as C
  }
  [StageSymbol]: boolean
  protected _config!: C
  constructor()
  constructor(name: string)
  constructor(config: C)
  constructor(runFn: RunPipelineFunction<R>)
  constructor(stage: AnyStage<R>)
  constructor(config?: AllowedStage<R, C>) {
    this[StageSymbol] = true
    if (config) {
      if (typeof config === 'string') {
        this._config = { name: config } as C extends StageConfig<R> ? C : never
      } else {
        let res = getStageConfig<R, C>(config) as C extends StageConfig<R> ? C : never
        if (isAnyStage<R>(res)) {
          this._config = res.config as any
        } else {
          this._config = res
        }
      }
    } else {
      this._config = {} as C extends StageConfig<R> ? C : never
    }
  }

  public get reportName() {
    return `STG:${this._config.name ? this._config.name : ''}`
  }

  public toString() {
    return '[pipeline Stage]'
  }

  public get name() {
    return this._config.name ?? ''
  }

  // может быть вызван как Promise
  // сделать все дубликаты и проверки методов для работы с промисами
  public execute(context: R): Promise<R>
  public execute(context: R, callback: CallbackFunction<R>): void
  public execute(err: unknown, context: R, callback: CallbackFunction<R>): void
  public execute(
    _err?: unknown,
    _context?: unknown,
    _callback?: unknown,
  ): void | Promise<R> {
    // discover arguments
    let err: Possible<ComplexError>
    let not_ensured_context: R | R
    let __callback: Possible<CallbackFunction<R>> = undefined

    if (arguments.length == 1) {
      not_ensured_context = _err as R | R
      // promise
    } else if (arguments.length == 2) {
      if (typeof _context == 'function') {
        // callback
        not_ensured_context = _err as R | R
        err = undefined
        __callback = _context as CallbackFunction<R>
      } else {
        // promise
        err = _err as ComplexError
        not_ensured_context = _context as R | R
      }
    } else {
      // callback
      err = _err as ComplexError
      not_ensured_context = _context as R | R
      __callback = _callback as CallbackFunction<R>
    }

    if (!this.run) {
      this.run = this.compile()
    } else if (!this.config?.run) {
      // legacy run
      if (!isStageRun(this.run)) {
        var legacy = this.run

        this.run = execute_custom_run<R>(legacy as RunPipelineFunction<R>)
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
      return new Promise<R>((res, rej) => {
        this.execute(err, context, (err, ctx) => {
          if (err) {
            rej(err)
          } else {
            if (input_is_context) {
              res(ctx ?? context)
            } else {
              if (Context.isProxy(ctx)) {
                res(ctx.original as R)
              } else {
                res(ctx as unknown as R)
              }
            }
          }
        })
      })
    } else {
      const back: typeof __callback = (err, _ctx) => {
        if (input_is_context) {
          __callback?.(err, _ctx)
        } else {
          if (Context.isProxy<R>(_ctx)) {
            __callback?.(err, _ctx.original as R)
          } else {
            __callback?.(err, _ctx)
          }
        }
      }
      const successRescue = (ret: R) => {
        if (this._config.output) {
          this.validate(this._config.output, ret ?? context, (err_, ctx) => {
            if (err_) {
              this.rescue(err_, ctx ?? context, fail, successRescue)
            } else {
              back(err, ctx ?? context)
            }
          })
        } else {
          success(ret)
        }
      }
      const success = (ret: R) => back(undefined, ret ?? context)
      const fail = (err: unknown) => back(err, context)

      const callback = (err?, _ctx?: R) => {
        if (err) {
          this.rescue(err, _ctx ?? context, fail, successRescue)
        } else {
          if (this._config.output) {
            this.validate(this._config.output, _ctx ?? context, (err_, ctx) => {
              if (err_) {
                this.rescue(err_, ctx ?? context, fail, successRescue)
              } else {
                back(err, ctx ?? context)
              }
            })
          } else {
            back(err, _ctx ?? context)
          }
        }
      }

      if (err && this._config.run && !can_fix_error(this._config.run)) {
        this.rescue(err, context, fail, successRescue)
      } else {
        if (this._config.input) {
          this.validate(this._config.input, context, (err_, ctx) => {
            this.runStageMethod(err, err_, ctx, context, stageToRun, callback)
          })
        } else {
          stageToRun(undefined, context, callback)
        }
      }
    }
  }

  protected runStageMethod(
    err_: unknown,
    err: unknown,
    ctx: R | undefined,
    context: R,
    stageToRun: StageRun<R>,
    callback: CallbackFunction<R>,
  ) {
    if (err || err_) {
      if (this.config.run && !can_fix_error(this.config.run)) {
        this.rescue(CreateError([err, err_] as Array<Error>), ctx ?? context, callback, rescuedContext => {
          // ошибка обработана все хорошо, продолжаем
          stageToRun(undefined, rescuedContext, callback)
        })
      } else {
        // обработка ошибок может происходить внутри функции
        stageToRun(CreateError([err, err_] as Array<Error>), ctx ?? context, callback)
      }
    } else {
      stageToRun(undefined, ctx ?? context, callback)
    }
  }

  protected stage(err: unknown, context: R, callback: CallbackFunction<R>) {
    const back = callback
    const sucess = (ret: unknown) => back(undefined, (ret ?? context) as R)
    const fail = (err: unknown) => back(err, context)
    if (this._config.run) {
      if (context) {
        ;(execute_callback<R>).call(this, err, this._config.run, context, callback)
      } else {
        // возвращаем управление
        callback(err)
      }
    } else {
      const retErr: Array<any> = [this.reportName + ' reports: run is not a function']
      if (err) {
        retErr.push(err)
      }
      this.rescue(CreateError(retErr), context, fail, sucess)
    }
  }

  // to be overridden by compile
  protected run?: StageRun<R>
  /**
   * Compile the pipeline.
   * @param rebuild Whether to rebuild the pipeline.
   * @returns The compiled pipeline.
   */
  protected compile(rebuild: boolean = false): StageRun<R> {
    let res: StageRun<R>
    if (this.config.compile) {
      res = this.config.compile.call(this, rebuild)
    } else if (!this.run || rebuild) {
      res = this.stage
    } else {
      if (isStageRun<R>(this.run)) {
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
    context: R,
    fail: (err: unknown) => void,
    success: (ctx: R) => void,
  ) {
    let err: Possible<ComplexError>

    if (_err) {
      if (!(_err instanceof Error)) {
        err = CreateError(_err)
      } else {
        err = CreateError(_err)
      }
    } else {
      err = null
    }

    if (err && this._config.rescue) {
      execute_rescue(this._config.rescue, err, context, _err => {
        // здесь может быть исправлена ошибка, и контекст передается дальше на выполнение
        if (_err) {
          fail(_err)
        } else {
          success(context)
        }
      })
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
    context: R,
  ): Promise<[unknown, R]> {
    return new Promise(resolve => {
      this.rescue(_err, context, err => {
        resolve([err, context])
      }, res => {
        resolve([undefined, res ?? context])
      })
    })
  }

  protected validate(
    validate: z.ZodType<R>,
    context: R,
    callback: CallbackFunction<R>,
  ) {
    validate.safeParseAsync(context)
      .then(result => {
        if (!result.success) {
          callback(CreateError(fromZodError(result?.error)), context)
        } else {
          callback(undefined, context)
        }
      })
  }
}
