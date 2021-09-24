import { CreateError } from './utils/ErrorList'
import {
  AllowedStage,
  CallbackFunction,
  EnsureFunction,
  getStageConfig,
  RunPipelineFunction,
  StageConfig,
  StageRun,
  ValidateFunction,
  Possible,
} from './utils/types'

import { execute_ensure } from './utils/execute_ensure'
import { execute_validate } from './utils/execute_validate'
import { execute_rescue } from './utils/execute_rescue'
import { execute_callback } from './utils/execute_callback'
import { can_fix_error } from './utils/can_fix_error'
import { execute_custom_run } from './utils/execute_custom_run'
import { isStageRun, Rescue } from './utils/types'

// make possibility to context be immutable for debug purposes

export class Stage<T, C extends StageConfig<T, R>, R = T> {
  public get config(): C {
    return this._config
  }
  protected _config!: C
  constructor(config?: AllowedStage<T, C, R>) {
    if (config) {
      let res = getStageConfig(config)
      if (res instanceof Stage) {
        return res as Stage<T, C, R>
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
    err_: Possible<Error>,
    err: Possible<Error>,
    ctx: Possible<T>,
    context: T,
    stageToRun: StageRun<T, R>,
    callback: CallbackFunction<R>,
  ) {
    if (err || err_) {
      if (this.config.run && !can_fix_error(this.config.run)) {
        this.rescue<T>(
          CreateError([err, err_]),
          ctx ?? context,
          callback,
          (rescuedContext: Possible<T>) => {
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
  public execute(context: Possible<T>): Promise<Possible<R>>
  public execute(context: Possible<T>, callback: CallbackFunction<R>): void
  public execute(
    err: Possible<Error>,
    context: Possible<T>,
    callback: CallbackFunction<R>,
  ): void
  public execute(
    _err?: Possible<Error | T>,
    _context?: Possible<T> | CallbackFunction<R>,
    _callback?: Possible<CallbackFunction<R>>,
  ): void | Promise<Possible<R>> {
    // discover arguments
    let err: Possible<Error>,
      context: T,
      __callback: Possible<CallbackFunction<R>>

    if (arguments.length == 1) {
      context = _err as T
      //promise
    } else if (arguments.length == 2) {
      if (typeof _context == 'function') {
        // callback
        context = _err as T
        err = undefined
        __callback = _context as CallbackFunction<R>
      } else {
        //promise
        err = _err as Error
        context = _context as T
      }
    } else {
      // callback
      err = _err as Error
      context = _context as T
      __callback = _callback as CallbackFunction<R>
    }

    if (!this.run) {
      this.run = this.compile()
    } else if (!this.config?.run) {
      // legacy run
      if (!isStageRun(this.run)) {
        var legacy = this.run as RunPipelineFunction<T, R>
        this.run = execute_custom_run(legacy)
      }
    }

    const stageToRun = this.run.bind(this)

    if (!__callback) {
      return new Promise((res, rej) => {
        this.execute(err, context, (err: Possible<Error>, ctx: Possible<R>) => {
          if (err) rej(err)
          else res(ctx)
        })
      })
    } else {
      const back = __callback
      process.nextTick(() => {
        const sucess = (ret: Possible<R>) =>
          back(undefined, ret ?? (context as unknown as R))
        const fail = (err: Possible<Error>) =>
          back(err, context as unknown as R)
        const callback = (err: Possible<Error>, _ctx: Possible<R>) => {
          if (err) {
            this.rescue(err, _ctx, fail, sucess)
          } else {
            back(err, _ctx)
          }
        }

        if (err && this._config.run && !can_fix_error(this._config.run)) {
          this.rescue(err, context as unknown as Possible<R>, fail, sucess)
        } else {
          if (this.config.ensure) {
            this.ensure(
              this.config.ensure,
              context,
              (err_: Possible<Error>, ctx: Possible<T>) => {
                this.runStageMethod(
                  err,
                  err_,
                  ctx,
                  context,
                  stageToRun,
                  callback,
                )
              },
            )
          } else if (this._config.validate) {
            this.validate(
              this._config.validate,
              context,
              (err_: Possible<Error>, ctx: Possible<T>) => {
                this.runStageMethod(
                  err,
                  err_,
                  ctx,
                  context,
                  stageToRun,
                  callback,
                )
              },
            )
          } else {
            stageToRun(undefined, context, callback)
          }
        }
      })
    }
  }

  protected stage(
    err: Possible<Error>,
    context: Possible<T>,
    callback: CallbackFunction<R>,
  ) {
    const back = callback
    const sucess = (ret: Possible<R>) =>
      back(undefined, ret ?? (context as unknown as R))
    const fail = (err: Possible<Error>) => back(err, context as unknown as R)
    if (this._config.run) {
      if (context) {
        execute_callback(
          err,
          this._config.run,
          context,
          (err: Possible<Error>, ctx: Possible<R>) => {
            if (err) {
              this.rescue<R>(
                err,
                ctx ?? (context as unknown as R),
                fail,
                sucess,
              )
            } else {
              callback(undefined, ctx ?? (context as unknown as R))
            }
          },
        )
      } else {
        // возвращаем управление
        callback(null, context as unknown as R)
      }
    } else {
      const retErr: Array<any> = [
        this.reportName + ' reports: run is not a function',
      ]
      if (err) retErr.push(err)
      this.rescue(CreateError(retErr), context as unknown as R, fail, sucess)
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
      if (isStageRun<T, R>(this.run)) {
        res = this.run
      } else {
        res = execute_custom_run(this.run as RunPipelineFunction<T, R>)
      }
    }
    return res
  }
  // to be overridden by compile
  protected run?: StageRun<T, R>

  // объединение ошибок сделать
  // посмотреть что нужно сделать чтобы вызвать ошибку правильно!!!
  // в начале выполнения важен правильный callback, возможно без контекста
  // в конце важен и контекст ошибки? или не важен
  protected rescue<E>(
    _err: Possible<Error | string>,
    context: Possible<E>,
    fail: (err: Possible<Error>) => void,
    success: (ctx: Possible<E>) => void,
  ) {
    let err: Possible<Error>

    if (_err) {
      if (!(_err instanceof Error)) {
        err = CreateError(_err)
      } else {
        err = _err
      }
    } else {
      err = null
    }

    if (err && this._config.rescue) {
      execute_rescue<E>(
        this._config.rescue as Rescue<E>,
        err,
        context,
        (_err: Possible<Error>) => {
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
    context: T,
    callback: CallbackFunction<T>,
  ) {
    execute_validate(
      validate,
      context,
      (err: Possible<Error>, result: Possible<boolean>) => {
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
      (err: Possible<Error>, result: Possible<T>) => {
        callback(err, result ?? context)
      },
    )
  }
}

export type EnsureParams<T> = {
  context: T
  callback: CallbackFunction<T> | undefined
  err: Possible<Error>
  is_promise: boolean
}
