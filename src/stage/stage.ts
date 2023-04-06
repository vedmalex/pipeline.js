import { Context, ContextType, OriginalObject } from './Context'
import { StageConfig } from './StageConfig'
import { ComplexError, CreateError, can_fix_error } from './errors'
import { StageSymbol, getStageConfig, isAnyStage } from './getStageConfig'
import {
  AllowedStage,
  AnyStage,
  CallbackFunction,
  EnsureFunction,
  Possible,
  RunPipelineFunction,
  StageObject,
  StageRun,
  ValidateFunction,
  isStageRun,
} from './types'
import { execute_callback } from './utils/execute_callback'
import { execute_custom_run } from './utils/execute_custom_run'
import { execute_ensure } from './utils/execute_ensure'
import { execute_rescue } from './utils/execute_rescue'
import { execute_validate } from './utils/execute_validate'

export class Stage<R extends StageObject, C extends StageConfig<R> = StageConfig<R>> implements AnyStage<R> {
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

  public toString() {
    return '[pipeline Stage]'
  }

  public get name() {
    return this._config.name ?? ''
  }

  // может быть вызван как Promise
  // сделать все дубликаты и проверки методов для работы с промисами
  public execute<T extends StageObject>(context: T & R): Promise<T & R>
  public execute<T extends StageObject>(context: T & R, callback: CallbackFunction<T & R>): void
  public execute<T extends StageObject>(err: unknown, context: T & R, callback: CallbackFunction<T & R>): void
  public execute<T extends StageObject>(
    _err?: unknown,
    _context?: unknown,
    _callback?: unknown,
  ): void | Promise<T & R> {
    // discover arguments
    let err: Possible<ComplexError>
    let not_ensured_context: (T & R) | ContextType<T & R>
    let __callback: Possible<CallbackFunction<T & R>> = undefined

    if (arguments.length == 1) {
      not_ensured_context = _err as (T & R) | ContextType<T & R>
      // promise
    } else if (arguments.length == 2) {
      if (typeof _context == 'function') {
        // callback
        not_ensured_context = _err as (T & R) | ContextType<T & R>
        err = undefined
        __callback = _context as CallbackFunction<T & R>
      } else {
        // promise
        err = _err as ComplexError
        not_ensured_context = _context as (T & R) | ContextType<T & R>
      }
    } else {
      // callback
      err = _err as ComplexError
      not_ensured_context = _context as (T & R) | ContextType<T & R>
      __callback = _callback as CallbackFunction<T & R>
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

    const input_is_context = Context.isContext(not_ensured_context)
    let context = Context.ensure<T & R>(not_ensured_context)
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
          if (Context.isContext<T & R>(_ctx)) {
            __callback?.(err, _ctx.original as T & R)
          } else {
            __callback?.(CreateError([err, new Error('context is always context object')]), _ctx)
          }
        }
      }
      const success = (ret: unknown) => back(undefined, (ret as T & R) ?? context)
      const fail = (err: unknown) => back(err, context)

      const callback = (err, _ctx) => {
        if (err) {
          this.rescue(err, _ctx ?? context, fail, success)
        } else {
          back(err, _ctx ?? context)
        }
      }

      if (err && this._config.run && !can_fix_error(this._config.run)) {
        this.rescue(err, context, fail, success)
      } else {
        if (this.config.ensure) {
          this.ensure(this.config.ensure, context, (err_, ctx) => {
            this.runStageMethod(err, err_, ctx, context, stageToRun, callback)
          })
        } else if (this._config.validate) {
          this.validate(this._config.validate, context, (err_, ctx) => {
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
    ctx: ContextType<R> | undefined,
    context: ContextType<R>,
    stageToRun: StageRun<R>,
    callback: CallbackFunction<ContextType<R>>,
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

  protected stage(err: unknown, context: ContextType<R>, callback: CallbackFunction<ContextType<R>>) {
    const back = callback
    const sucess = (ret: unknown) => back(undefined, (ret ?? context) as ContextType<R>)
    const fail = (err: unknown) => back(err, context)
    if (this._config.run) {
      if (context) {
        execute_callback.call(this, err, this._config.run, context, callback as CallbackFunction<unknown>)
      } else {
        // возвращаем управление
        callback(err)
      }
    } else {
      const retErr: Array<any> = [this.reportName + ' reports: run is not a function']
      if (err) retErr.push(err)
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
    if (this.config.precompile) {
      this.config.precompile.apply(this)
    }
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
  protected rescue<T extends StageObject>(
    _err: unknown,
    context: ContextType<T>,
    fail: (err: unknown) => void,
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
      execute_rescue<T>(this._config.rescue, err, context, (_err: Possible<ComplexError>) => {
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

  protected rescue_async<R extends StageObject>(
    _err: unknown,
    context: ContextType<R>,
  ): Promise<[unknown, ContextType<R>]> {
    return new Promise(resolve => {
      this.rescue(
        _err,
        context,
        err => {
          resolve([err, context])
        },
        res => {
          resolve([undefined, res ?? context])
        },
      )
    })
  }

  protected validate(
    validate: ValidateFunction<R>,
    context: ContextType<R>,
    callback: CallbackFunction<ContextType<R>>,
  ) {
    execute_validate(validate, context, (err, result) => {
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
    })
  }
  protected ensure(ensure: EnsureFunction<R>, context: ContextType<R>, callback: CallbackFunction<ContextType<R>>) {
    execute_ensure<R>(ensure, context, (err, result) => {
      callback(err, result ?? context)
    })
  }
}
