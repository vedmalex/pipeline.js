import { ComplexError, CreateError } from './utils/ErrorList'
import {
  AllowedStage,
  CallbackExternalFunction,
  CallbackFunction,
  EnsureFunction,
  getStageConfig,
  InternalStageRun,
  Possible,
  RunPipelineFunction,
  StageConfig,
  StageObject,
  StageRun,
  ValidateFunction,
} from './utils/types'

import { Context, ContextType, OriginalObject } from './context'
import { can_fix_error } from './utils/can_fix_error'
import { execute_callback } from './utils/execute_callback'
import { execute_custom_run } from './utils/execute_custom_run'
import { execute_ensure } from './utils/execute_ensure'
import { execute_rescue } from './utils/execute_rescue'
import { execute_validate } from './utils/execute_validate'
import { isStageRun, Rescue, AnyStage, isAnyStage } from './utils/types'
export const StageSymbol = Symbol('stage')
// make possibility to context be immutable for debug purposes
export function isStage<
  T extends StageObject,
  C extends StageConfig<T> = StageConfig<T>,
>(obj: any): obj is Stage<T, C> {
  return !!obj[StageSymbol]
}
export class Stage<
  T extends StageObject,
  C extends StageConfig<T> = StageConfig<T>,
> {
  public get config(): C {
    return this._config
  }
  [StageSymbol]: boolean
  protected _config!: C
  constructor()
  constructor(name: string)
  constructor(config: C)
  constructor(runFn: RunPipelineFunction<T>)
  constructor(stage: AnyStage<T>)
  constructor(config?: AllowedStage<T, T, C>) {
    this[StageSymbol] = true
    if (config) {
      let res = getStageConfig(config)
      if (isAnyStage<T, C>(res)) {
        return res as Stage<T, C>
      } else {
        this._config = res as C
      }
    } else {
      this._config = {} as C
    }
  }

  public get reportName() {
    return `STG:${this._config.name ? this._config.name : ''}`
  }

  public get name() {
    return this._config.name ?? ''
  }

  protected runStageMethod(
    err_: Possible<ComplexError>,
    err: Possible<ComplexError>,
    ctx: ContextType<T>,
    context: ContextType<T>,
    stageToRun: InternalStageRun<T>,
    callback: CallbackFunction<T>,
  ) {
    if (err || err_) {
      if (this.config.run && !can_fix_error({ run: this.config.run })) {
        this.rescue<T>(
          CreateError([err, err_]),
          ctx ?? context,
          callback,
          rescuedContext => {
            // ошибка обработана все хорошо, продолжаем
            stageToRun(undefined, rescuedContext, callback)
          },
        )
      } else {
        // обработка ошибок может происходить внутри функции
        stageToRun(CreateError([err, err_]), ctx ?? context, callback)
      }
    } else {
      stageToRun(undefined, ctx ?? context, callback)
    }
  }

  // может быть вызван как Promise
  // сделать все дубликаты и проверки методов для работы с промисами
  public execute(context: T): Promise<T>
  public execute(context: ContextType<T>): Promise<T>
  public execute(context: T, callback: CallbackExternalFunction<T>): void
  public execute(
    context: ContextType<T>,
    callback: CallbackExternalFunction<T>,
  ): void
  public execute(
    err: Possible<ComplexError>,
    context: T,
    callback: CallbackExternalFunction<T>,
  ): void
  public execute(
    _err?: Possible<ComplexError | T>,
    _context?: T | CallbackExternalFunction<T>,
    _callback?: Possible<CallbackExternalFunction<T>>,
  ): void | Promise<T> {
    // discover arguments
    let err: Possible<ComplexError>,
      not_ensured_context: T | ContextType<T>,
      __callback: Possible<CallbackExternalFunction<T>>

    if (arguments.length == 1) {
      not_ensured_context = _err as T | ContextType<T>
      // promise
    } else if (arguments.length == 2) {
      if (typeof _context == 'function') {
        // callback
        not_ensured_context = _err as T | ContextType<T>
        err = undefined
        __callback = _context as CallbackFunction<T>
      } else {
        // promise
        err = _err as ComplexError
        not_ensured_context = _context as T | ContextType<T>
      }
    } else {
      // callback
      err = _err as ComplexError
      not_ensured_context = _context as T | ContextType<T>
      __callback = _callback as CallbackFunction<T>
    }

    if (!this.run) {
      this.run = this.compile()
    } else if (!this.config?.run) {
      // legacy run
      if (!isStageRun(this.run)) {
        var legacy = this.run as RunPipelineFunction<T>
        this.run = execute_custom_run(legacy)
      }
    }

    const stageToRun = this.run.bind(this)

    const input_is_context = Context.isContext(not_ensured_context)
    let context = Context.ensure<T>(not_ensured_context)
    if (input_is_context) {
      ;(context as unknown as Context<T>)[OriginalObject] = true
    }
    if (!__callback) {
      return new Promise((res, rej) => {
        this.execute(err, context, ((err: Possible<ComplexError>, ctx: T) => {
          if (err) rej(err)
          else {
            if (input_is_context) {
              res(ctx)
            } else {
              if (Context.isContext(ctx)) {
                res(ctx.original)
              } else {
                res(ctx)
              }
            }
          }
        }) as CallbackFunction<T>)
      })
    } else {
      const back: typeof __callback = (err, _ctx) => {
        if (input_is_context) {
          __callback?.(err, _ctx)
        } else {
          if (Context.isContext(_ctx)) {
            __callback?.(err, _ctx.original)
          } else {
            __callback?.(
              CreateError([err, new Error('context is always context object')]),
              _ctx,
            )
          }
        }
      }
      process.nextTick(() => {
        const sucess = (ret: T) => back(undefined, ret ?? context)
        const fail = (err: Possible<ComplexError>) => back(err, context)
        const callback = ((
          err: Possible<ComplexError>,
          _ctx: ContextType<T>,
        ) => {
          if (err) {
            this.rescue(err, _ctx, fail, sucess)
          } else {
            back(err, _ctx)
          }
        }) as CallbackFunction<T>

        if (
          err &&
          this._config.run &&
          !can_fix_error({ run: this._config.run })
        ) {
          this.rescue(err, context, fail, sucess)
        } else {
          if (this.config.ensure) {
            this.ensure(this.config.ensure, context, ((
              err_: Possible<ComplexError>,
              ctx: ContextType<T>,
            ) => {
              this.runStageMethod(err, err_, ctx, context, stageToRun, callback)
            }) as CallbackFunction<T>)
          } else if (this._config.validate) {
            this.validate(this._config.validate, context, ((
              err_: Possible<ComplexError>,
              ctx: ContextType<T>,
            ) => {
              this.runStageMethod(err, err_, ctx, context, stageToRun, callback)
            }) as CallbackFunction<T>)
          } else {
            stageToRun(undefined, context, callback)
          }
        }
      })
    }
  }

  protected stage(
    err: Possible<ComplexError>,
    context: ContextType<T>,
    callback: CallbackFunction<T>,
  ) {
    const back = callback
    const sucess = (ret: ContextType<T>) => back(undefined, ret ?? context)
    const fail = (err: Possible<ComplexError>) => back(err, context)
    if (this._config.run) {
      if (context) {
        execute_callback(err, this._config.run, context, ((
          err: Possible<ComplexError>,
          ctx: ContextType<T>,
        ) => {
          if (err) {
            this.rescue(err, ctx ?? context, fail, sucess)
          } else {
            callback(undefined, ctx ?? context)
          }
        }) as CallbackFunction<T>)
      } else {
        // возвращаем управление
        callback(null, context)
      }
    } else {
      const retErr: Array<any> = [
        this.reportName + ' reports: run is not a function',
      ]
      if (err) retErr.push(err)
      this.rescue(CreateError(retErr), context, fail, sucess)
    }
  }

  public compile(rebuild: boolean = false): StageRun<T> {
    let res: StageRun<T>
    if (this.config.precompile) {
      this.config.precompile()
    }
    if (this._config.compile) {
      res = this._config.compile.call(this, rebuild)
    } else if (!this.run || rebuild) {
      res = this.stage
    } else {
      if (isStageRun<T>(this.run)) {
        res = this.run
      } else {
        res = execute_custom_run(this.run as RunPipelineFunction<T>)
      }
    }
    return res
  }
  // to be overridden by compile
  protected run?: InternalStageRun<T>

  // объединение ошибок сделать
  // посмотреть что нужно сделать чтобы вызвать ошибку правильно!!!
  // в начале выполнения важен правильный callback, возможно без контекста
  // в конце важен и контекст ошибки? или не важен
  protected rescue<E>(
    _err: Possible<Error | string>,
    context: ContextType<T>,
    fail: (err: Possible<ComplexError>) => void,
    success: (ctx: ContextType<T>) => void,
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
      execute_rescue<E>(
        this._config.rescue as Rescue<E>,
        err,
        context,
        (_err: Possible<ComplexError>) => {
          // здесь может быть исправлена ошибка, и контекст передается дальше на выполнение
          if (_err) {
            fail(_err)
          } else {
            success(context)
          }
        },
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

  public toString() {
    return '[pipeline Stage]'
  }

  protected validate(
    validate: ValidateFunction<T>,
    context: ContextType<T>,
    callback: CallbackFunction<T>,
  ) {
    execute_validate(validate, context, ((
      err: Possible<ComplexError>,
      result: boolean,
    ) => {
      if (err) {
        callback(err, context)
      } else {
        if (result) {
          if ('boolean' === typeof result) {
            callback(undefined, context)
          } else if (Array.isArray(result)) {
            callback(CreateError(result))
          }
        } else {
          callback(CreateError(this.reportName + ' reports: T is invalid'))
        }
      }
    }) as CallbackFunction<boolean>)
  }
  protected ensure(
    ensure: EnsureFunction<T>,
    context: ContextType<T>,
    callback: CallbackFunction<T>,
  ) {
    execute_ensure(ensure, context, ((
      err: Possible<ComplexError>,
      result: ContextType<T>,
    ) => {
      callback(err, result ?? context)
    }) as CallbackFunction<T>)
  }
}

export type EnsureParams<T> = {
  context: ContextType<T>
  callback: CallbackFunction<T> | undefined
  err: Possible<ComplexError>
  is_promise: boolean
}
