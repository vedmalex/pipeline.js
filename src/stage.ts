import { CreateError } from './utils/ErrorList'
import {
  AllowedStage,
  CallbackFunction,
  EnsureFunction,
  getStageConfig,
  Possible,
  RunPipelineFunction,
  StageConfig,
  StageObject,
  StageRun,
  ValidateFunction,
} from './utils/types'

import { Context, ContextType } from './context'
import { can_fix_error } from './utils/can_fix_error'
import { execute_callback } from './utils/execute_callback'
import { execute_custom_run } from './utils/execute_custom_run'
import { execute_ensure } from './utils/execute_ensure'
import { execute_rescue } from './utils/execute_rescue'
import { execute_validate } from './utils/execute_validate'
import { isStageRun, Rescue, AnyStage } from './utils/types'

// make possibility to context be immutable for debug purposes

export class Stage<T extends StageObject, C extends StageConfig<T>> {
  public get config(): C {
    return this._config
  }
  protected _config!: C
  constructor()
  constructor(name: string)
  constructor(config: C)
  constructor(runFn: RunPipelineFunction<T>)
  constructor(stage: AnyStage<T>)
  constructor(config?: AllowedStage<T, C>) {
    if (config) {
      let res = getStageConfig(config)
      if (res instanceof Stage) {
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
    err_: Possible<Error>,
    err: Possible<Error>,
    ctx: Possible<T>,
    context: T,
    stageToRun: StageRun<T>,
    callback: CallbackFunction<T>,
  ) {
    if (err || err_) {
      if (this.config.run && !can_fix_error({ run: this.config.run })) {
        this.rescue<T>(
          CreateError([err, err_]),
          ctx ?? context,
          callback,
          (rescuedContext: T) => {
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
  public execute(context: Possible<T | ContextType<T>>): Promise<Possible<T>>
  public execute(
    context: Possible<T | ContextType<T>>,
    callback: CallbackFunction<T>,
  ): void
  public execute(
    err: Possible<Error>,
    context: T,
    callback: CallbackFunction<T>,
  ): void
  public execute(
    _err?: Possible<Error | T>,
    _context?: Possible<T> | CallbackFunction<T>,
    _callback?: Possible<CallbackFunction<T>>,
  ): void | Promise<Possible<T>> {
    // discover arguments
    let err: Possible<Error>,
      not_ensured_context: T | ContextType<T>,
      __callback: Possible<CallbackFunction<T>>

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
        err = _err as Error
        not_ensured_context = _context as T | ContextType<T>
      }
    } else {
      // callback
      err = _err as Error
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

    let context = Context.ensure<T>(not_ensured_context)

    if (!__callback) {
      return new Promise((res, rej) => {
        this.execute(err, context, ((err: Possible<Error>, ctx: T) => {
          if (err) rej(err)
          else res(ctx)
        }) as CallbackFunction<T>)
      })
    } else {
      const back = __callback
      process.nextTick(() => {
        const sucess = (ret: Possible<T>) => back(undefined, ret ?? context)
        const fail = (err: Possible<Error>) => back(err, context)
        const callback = ((err: Possible<Error>, _ctx: T) => {
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
          this.rescue(err, context as unknown as Possible<T>, fail, sucess)
        } else {
          if (this.config.ensure) {
            this.ensure(this.config.ensure, context, ((
              err_: Possible<Error>,
              ctx: T,
            ) => {
              this.runStageMethod(err, err_, ctx, context, stageToRun, callback)
            }) as CallbackFunction<T>)
          } else if (this._config.validate) {
            this.validate(this._config.validate, context, ((
              err_: Possible<Error>,
              ctx: T,
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
    err: Possible<Error>,
    context: T,
    callback: CallbackFunction<T>,
  ) {
    const back = callback
    const sucess = (ret: Possible<T>) => back(undefined, ret ?? context)
    const fail = (err: Possible<Error>) => back(err, context)
    if (this._config.run) {
      if (context) {
        execute_callback(err, this._config.run, context, ((
          err: Possible<Error>,
          ctx: T,
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
  protected run?: StageRun<T>

  // объединение ошибок сделать
  // посмотреть что нужно сделать чтобы вызвать ошибку правильно!!!
  // в начале выполнения важен правильный callback, возможно без контекста
  // в конце важен и контекст ошибки? или не важен
  protected rescue<E>(
    _err: Possible<Error | string>,
    context: E,
    fail: (err: Possible<Error>) => void,
    success: (ctx: E) => void,
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
    execute_validate(validate, context, ((
      err: Possible<Error>,
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
    context: T,
    callback: CallbackFunction<T>,
  ) {
    execute_ensure(ensure, context, ((
      err: Possible<Error>,
      result: Possible<T>,
    ) => {
      callback(err, result ?? context)
    }) as CallbackFunction<T>)
  }
}

export type EnsureParams<T> = {
  context: T
  callback: CallbackFunction<T> | undefined
  err: Possible<Error>
  is_promise: boolean
}
