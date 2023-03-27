import { ComplexError, CreateError } from './utils/ErrorList'
import {
  AllowedStage,
  CallbackFunction,
  EnsureFunction,
  getStageConfig,
  AnyStage,
  Possible,
  RunPipelineFunction,
  StageConfig,
  StageRun,
  ValidateFunction,
  StageObject,
} from './utils/types/types'

import { Context, ContextType, OriginalObject } from './context'
import { can_fix_error } from './utils/can_fix_error'
import { execute_callback } from './utils/execute_callback'
import { execute_custom_run } from './utils/execute_custom_run'
import { execute_ensure } from './utils/execute_ensure'
import { execute_rescue } from './utils/execute_rescue'
import { execute_validate } from './utils/execute_validate'
import { isStageRun, isAnyStage } from './utils/types/types'

export const StageSymbol = Symbol('stage')
// make possibility to context be immutable for debug purposes
export function isStage(obj: unknown): boolean {
  return typeof obj === 'object' && obj !== null && StageSymbol in obj
}

export class Stage<R, C extends StageConfig<R> = StageConfig<R>> implements AnyStage<R> {
  public get config(): C {
    return this._config
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
      let res = getStageConfig(config)
      if (isAnyStage(res)) {
        return res as Stage<R, C>
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

  // может быть вызван как Promise
  // сделать все дубликаты и проверки методов для работы с промисами
  public execute<T extends StageObject>(context: T): Promise<T & R>
  public execute<T extends StageObject>(context: T | R, callback: CallbackFunction<T & R>): void
  public execute<T extends StageObject>(err: unknown, context: T, callback: CallbackFunction<T & R>): void
  public execute<T extends StageObject>(
    _err?: unknown,
    _context?: unknown,
    _callback?: unknown,
  ): void | Promise<T & R> {
    // discover arguments
    let err: Possible<ComplexError>, not_ensured_context: T | ContextType<T>, __callback: Possible<CallbackFunction<T>>

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
      this.run = this.compile() as StageRun<R>
    } else if (!this.config?.run) {
      // legacy run
      if (!isStageRun(this.run)) {
        var legacy = this.run
        this.run = execute_custom_run<R>(legacy)
      }
    }

    const stageToRun = this.run?.bind(this)

    const input_is_context = Context.isContext(not_ensured_context)
    let context = Context.ensure<T>(not_ensured_context)
    if (input_is_context) {
      context[OriginalObject] = true
    }
    if (!__callback) {
      return new Promise<T & R>((res, rej) => {
        this.execute(err, context, (err: unknown, ctx) => {
          if (err) rej(err)
          else {
            if (input_is_context) {
              res(ctx as T & R)
            } else {
              if (Context.isContext(ctx)) {
                res(ctx.original as T & R)
              } else {
                res(ctx as unknown as T & R)
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
          if (Context.isContext<T>(_ctx)) {
            __callback?.(err, _ctx.original as T)
          } else {
            __callback?.(CreateError([err, new Error('context is always context object')]), _ctx)
          }
        }
      }
      process.nextTick(() => {
        const sucess = (ret: unknown) => back(undefined, (ret as T) ?? context)
        const fail = (err: unknown) => back(err, context)
        const callback = (err, _ctx) => {
          if (err) {
            this.rescue(err, _ctx, fail, sucess)
          } else {
            back(err, _ctx)
          }
        }

        if (err && this._config.run && !can_fix_error(this._config.run)) {
          this.rescue(err, context, fail, sucess)
        } else {
          if (this.config.ensure) {
            this.ensure(this.config.ensure as EnsureFunction<unknown>, context, (err_, ctx) => {
              this.runStageMethod(err, err_, ctx, context, stageToRun, callback)
            })
          } else if (this._config.validate) {
            this.validate(this._config.validate, context, (err_, ctx) => {
              this.runStageMethod(err, err_, ctx, context, stageToRun, callback)
            })
          } else {
            stageToRun?.(undefined, context, callback)
          }
        }
      })
    }
  }

  protected runStageMethod(
    err_: unknown,
    err: unknown,
    ctx: unknown,
    context: unknown,
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

  protected stage(err: unknown, context: unknown, callback: CallbackFunction<R>) {
    const back = callback
    const sucess = (ret: unknown) => back(undefined, (ret ?? context) as R)
    const fail = (err: unknown) => back(err, context as R)
    if (this._config.run) {
      if (context) {
        execute_callback.call(this, err, this._config.run, context, (err: unknown, ctx: unknown) => {
          if (err) {
            this.rescue(err, ctx ?? context, fail, sucess)
          } else {
            callback(undefined, (ctx ?? context) as R)
          }
        })
      } else {
        // возвращаем управление
        callback(null, context as R)
      }
    } else {
      const retErr: Array<any> = [this.reportName + ' reports: run is not a function']
      if (err) retErr.push(err)
      this.rescue(CreateError(retErr), context, fail, sucess)
    }
  }

  /**
   * Compile the pipeline.
   * @param rebuild Whether to rebuild the pipeline.
   * @returns The compiled pipeline.
   */
  protected compile(rebuild: boolean = false): StageRun<R> {
    let res: StageRun<R>
    if (this.config.precompile) {
      this.config.precompile()
    }
    if (this.config.compile) {
      res = this.config.compile.call(this, rebuild)
    } else if (!this.run || rebuild) {
      res = this.stage
    } else {
      if (isStageRun(this.run)) {
        res = this.run
      } else {
        res = execute_custom_run(this.run as RunPipelineFunction<R>)
      }
    }
    return res
  }
  // to be overridden by compile
  protected run?: StageRun<R>

  // объединение ошибок сделать
  // посмотреть что нужно сделать чтобы вызвать ошибку правильно!!!
  // в начале выполнения важен правильный callback, возможно без контекста
  // в конце важен и контекст ошибки? или не важен
  protected rescue(_err: unknown, context: unknown, fail: (err: unknown) => void, success: (ctx: unknown) => void) {
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
      execute_rescue<R>(this._config.rescue, err, context, (_err: Possible<ComplexError>) => {
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

  public toString() {
    return '[pipeline Stage]'
  }

  protected validate(validate: ValidateFunction, context: unknown, callback: CallbackFunction<R>) {
    execute_validate(validate, context, (err, result) => {
      if (err) {
        callback(err, context as R)
      } else {
        if (result) {
          if ('boolean' === typeof result) {
            callback(undefined, context as R)
          } else if (Array.isArray(result)) {
            callback(CreateError(result))
          }
        } else {
          callback(CreateError(this.reportName + ' reports: T is invalid'))
        }
      }
    })
  }
  protected ensure(ensure: EnsureFunction<unknown>, context: unknown, callback: CallbackFunction<R>) {
    execute_ensure<R>(ensure, context, (err, result) => {
      callback(err, (result ?? context) as R)
    })
  }
}
