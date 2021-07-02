import { CreateError } from './utils/ErrorList'
import {
  AllowedStage,
  CallbackFunction,
  EnsureFunction,
  getStageConfig,
  StageConfig,
  StageRun,
  ValidateFunction,
} from './utils/types'

import { execute_ensure } from './utils/execute_ensure'
import { execute_validate } from './utils/execute_validate'
import { execute_rescue } from './utils/execute_rescue'
import { execute_callback } from './utils/execute_callback'
import { can_fix_error } from './utils/can_fix_error'
import { run_callback_once } from './utils/types'

// make possibility to context be immutable for debug purposes

export class Stage<T = any, C extends StageConfig<T, R> = any, R = T> {
  public get config(): C {
    return this._config
  }
  protected _config!: C
  constructor(config?: AllowedStage<T, C, R>) {
    if (config) {
      let res = getStageConfig(config)
      if (res instanceof Stage) {
        return res
      } else {
        this._config = res
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
  public execute(context: T): Promise<R | T>
  public execute(context: T, callback: CallbackFunction<R | T>): void
  public execute(
    err: Error | undefined,
    context: T,
    callback: CallbackFunction<R | T>,
  ): void
  public execute(
    _err: Error | T | undefined,
    _context?: T | CallbackFunction<R | T>,
    _callback?: CallbackFunction<R | T>,
  ): void | Promise<R | T> {
    // discover arguments
    let err: Error | undefined,
      context: T,
      __callback: CallbackFunction<R | T> | undefined

    if (arguments.length == 1) {
      context = _err as T
      //promise
    } else if (arguments.length == 2) {
      if (typeof _context == 'function') {
        // callback
        context = _err as T
        err = undefined
        __callback = _context as CallbackFunction<R | T>
      } else {
        //promise
        err = _err as Error
        context = _context as T
      }
    } else {
      // callback
      err = _err as Error
      context = _context as T
      __callback = _callback as CallbackFunction<R | T>
    }

    if (!this.run) {
      this.run = this.compile()
    }
    if (!__callback) {
      return new Promise((res, rej) => {
        this.execute(err, context as T, (err?: Error, ctx?: R | T) => {
          if (err) rej(err)
          else res(ctx as R | T)
        })
      })
    } else {
      const callback = run_callback_once(__callback)
      if (err && this._config.run && !can_fix_error(this._config.run)) {
        this.rescue(err, context, callback)
      } else {
        if (this.config.ensure) {
          this.ensure(this.config.ensure, context, (err_?: Error, ctx?: T) => {
            if (err || err_) {
              if (this._config.run && !can_fix_error(this._config.run)) {
                this.rescue(CreateError([err, err_]), ctx ?? context, callback)
              } else {
                // обработка ошибок может происходить внутри функции
                this.run?.(CreateError([err, err_]), ctx ?? context, callback)
              }
            } else {
              this.run?.(undefined, ctx ?? context, callback)
            }
          })
        } else if (this._config.validate) {
          this.validate(
            this._config.validate,
            context,
            (err_?: Error, ctx?: T) => {
              if (err || err_) {
                if (this._config.run && !can_fix_error(this._config.run)) {
                  this.rescue(
                    CreateError([err, err_]),
                    ctx ?? context,
                    callback,
                  )
                } else {
                  // обработка ошибок может происходить внутри функции
                  this.run?.(CreateError([err, err_]), ctx ?? context, callback)
                }
              } else {
                this.run?.(undefined, ctx ?? context, callback)
              }
            },
          )
        } else {
          this.run?.(undefined, context, callback)
        }
      }
    }
  }

  protected stage(
    err: Error | undefined,
    context: T,
    callback: CallbackFunction<T | R>,
  ) {
    if (this._config.run) {
      execute_callback(err, this._config.run, context, (err?: Error) => {
        if (err) {
          this.rescue(err, context, callback)
        } else {
          callback(undefined, context)
        }
      })
    } else {
      this.rescue(
        CreateError([this.reportName + ' reports: run is not a function', err]),
        context,
        callback,
      )
    }
  }

  public compile(rebuild: boolean = false): StageRun<T, R> {
    let res: StageRun<T, R>
    if (this.config.precompile) {
      this.config.precompile()
    }
    if (this._config.compile) {
      res = this._config.compile.call(this, rebuild)
    } else if (!this.run || rebuild) {
      res = this.stage
    } else {
      res = this.run
    }
    return res
  }
  // to be overridden by compile
  protected run?: StageRun<T, R>

  // объединение ошибок сделать
  protected rescue(
    err: Error | undefined,
    context: T,
    callback: CallbackFunction<T | R>,
  ) {
    if (err && !(err instanceof Error)) {
      if (typeof err == 'string') err = CreateError(err)
    }
    if (err && this._config.rescue) {
      execute_rescue(this._config.rescue, err, context, (_err?: Error) => {
        callback(_err, context)
      })
    } else {
      // отправить ошибку дальше
      callback(err, context)
    }
  }

  public toString() {
    return '[pipeline Stage]'
  }

  protected validate(
    validate: ValidateFunction<T>,
    context: T,
    callback: CallbackFunction<T>,
  ) {
    execute_validate(
      validate,
      context,
      (err: Error | undefined, result: boolean | undefined) => {
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
      },
    )
  }
  protected ensure(
    ensure: EnsureFunction<T>,
    context: T,
    callback: CallbackFunction<T>,
  ) {
    execute_ensure(
      ensure,
      context,
      (err: Error | undefined, result: T | undefined) => {
        callback(err, result ?? context)
      },
    )
  }
}

export type EnsureParams<T, R> = {
  context: T
  callback: CallbackFunction<R> | undefined
  err: Error | undefined
  is_promise: boolean
}
