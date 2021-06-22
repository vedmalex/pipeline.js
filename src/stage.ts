import {
  CallbackFunction,
  EnsureFunction,
  Func1Sync,
  Func2Sync,
  IStage,
  is_func2_async,
  is_func3,
  is_func3_async,
  is_thenable,
  Rescue,
  RunPipelineConfig,
  SingleStageFunction,
  StageConfig,
  StageRun,
  Thanable,
  ValidateFunction,
} from './utils/types'
import {
  is_func0,
  is_func2,
  is_func0_async,
  is_func1_async,
  is_func1,
} from './utils/types'
import {
  Func0Async,
  Func2Async,
  Func3Sync,
  Func0Sync,
  Func1Async,
} from './utils/types'

const ERROR = {
  signature: 'unacceptable run method signature',
}

// make possibility to context be immutable for debug purposes

export class Stage<T, R = T> implements IStage<T, R> {
  public get config() {
    return this._config
  }
  protected _config: StageConfig<T, R>
  constructor(config: string | StageConfig<T, R> | SingleStageFunction<T>) {
    this._config = {} as StageConfig<T, R>
    if (typeof config == 'string') {
      this._config.name = config
    } else if (typeof config == 'function') {
      this._config.run = config as SingleStageFunction<T>
    } else if (typeof config == 'object') {
      if (config.name) {
        this._config.name = config.name
      }
      if (config.rescue) {
        this._config.rescue = config.rescue
      }
      if (config.run) {
        this._config.run = config.run as RunPipelineConfig<T, R>
      }
      if (config.validate && config.schema) {
        throw new Error('use only one `validate` or `schema`')
      }
      if (config.ensure && config.schema) {
        throw new Error('use only one `ensure` or `schema`')
      }
      if (config.ensure && config.validate) {
        throw new Error('use only one `ensure` or `validate`')
      }
      if (config.validate) {
        this._config.validate = config.validate
      }
      if (config.ensure) {
        this._config.ensure = config.ensure
      }
      if (config.schema) {
        this._config.schema = config.schema
      }
    }

    if (!this._config.name && this._config.run) {
      var match = this._config.run.toString().match(/function\s*(\w+)\s*\(/)

      if (match && match[1]) {
        this._config.name = match[1]
      } else {
        this._config.name = this._config.run.toString()
      }
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
    const { context, callback, err, is_promise } = ensure_execute_params(
      _err,
      _context,
      _callback,
    )
    if (!this.run) {
      this.compile()
    }
    if (is_promise) {
      return new Promise((res, rej) => {
        this.execute(err, context as T, (err?: Error, ctx?: R | T) => {
          if (err) rej(err)
          else res(ctx as R | T)
        })
      })
    } else if (err && !can_fix_error(this._config.run) && callback) {
      this.rescue(err, context, callback)
    } else if (callback && this.run) {
      const run = this.run
      if (this.config.ensure) {
        this.ensure(this.config.ensure, context, (err_?: Error, ctx?: T) => {
          if (err || err_) {
            if (!can_fix_error(this._config.run)) {
              this.rescue(new ErrorList([err, err_]), ctx ?? context, callback)
            } else {
              // обработка ошибок может происходить внутри функции
              run(new ErrorList([err, err_]), ctx ?? context, callback)
            }
          } else {
            run(undefined, ctx ?? context, callback)
          }
        })
      } else if (this._config.validate) {
        this.validate(
          this._config.validate,
          context,
          (err_?: Error, ctx?: T) => {
            if (err || err_) {
              if (!can_fix_error(this._config.run)) {
                this.rescue(
                  new ErrorList([err, err_]),
                  ctx ?? context,
                  callback,
                )
              } else {
                // обработка ошибок может происходить внутри функции
                run(new ErrorList([err, err_]), ctx ?? context, callback)
              }
            } else {
              run(undefined, ctx ?? context, callback)
            }
          },
        )
      } else {
        run(undefined, context, callback)
      }
    }
  }

  protected stage(
    err: Error | undefined,
    context: T,
    callback: CallbackFunction<T | R>,
  ) {
    execute_callback(err, this._config.run, context, (err?: Error) => {
      if (err) {
        this.rescue(err, context, callback)
      } else {
        callback(undefined, context)
      }
    })
  }

  public compile(rebuild: boolean = false): StageRun<T, R> {
    let res: StageRun<T, R>
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
  protected rescue(err: Error, context: T, callback: CallbackFunction<T | R>) {
    if (err && !(err instanceof Error)) {
      if (typeof err == 'string') err = Error(err)
    }
    if (this._config.rescue) {
      execute_rescue(this._config.rescue, err, context, (_err?: Error) => {
        callback(new ErrorList([err, _err]), context)
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
    execute_validate(validate, context, (err, result) => {
      if (err) {
        callback(err, context)
      } else {
        if (result) {
          if ('boolean' === typeof result) {
            callback(undefined, context)
          } else if (Array.isArray(result)) {
            callback(new ErrorList(result))
          } else {
            // ensure works
            callback(undefined, result)
          }
        } else {
          callback(new Error(this.reportName + ' reports: T is invalid'))
        }
      }
    })
  }
  protected ensure(
    ensure: EnsureFunction<T>,
    context: T,
    callback: CallbackFunction<T>,
  ) {
    execute_ensure(ensure, context, (err, result) => {
      if (err) {
        callback(err, context)
      } else {
        if (result) {
          if ('boolean' === typeof result) {
            callback(undefined, context)
          } else if (Array.isArray(result)) {
            callback(new ErrorList(result))
          } else {
            // ensure works
            callback(undefined, result)
          }
        } else {
          callback(new Error(this.reportName + ' reports: T is invalid'))
        }
      }
    })
  }
}

// может не являться async funciton но может вернуть промис, тогда тоже должен отработать как промис

function execute_callback<T, R>(
  err: Error | undefined,
  run: RunPipelineConfig<T, R>,
  context: T,
  done: CallbackFunction<T | R>,
) {
  switch (run.length) {
    // this is the context of the run function
    case 0:
      if (is_func0_async<T>(run)) {
        try {
          const res = run.call(context)
          res.then(res => done(undefined, res || context)).catch(done)
        } catch (err) {
          processError<T | R>(err, done)
        }
      } else if (is_func0(run)) {
        try {
          const res = run.apply(context)
          if (res instanceof Promise) {
            res.then(_ => done(undefined, context)).catch(done)
          } else if (is_thenable(res)) {
            res.then(_ => done(undefined, context)).catch(done)
          } else {
            done(undefined, context)
          }
        } catch (err) {
          processError(err, done)
        }
      }
      break
    case 1:
      if (is_func1_async(run)) {
        try {
          ;(run as Func1Async<R | T, T>)(context)
            .then(ctx => done(undefined, ctx))
            .catch(done)
        } catch (err) {
          processError<T | R>(err, done)
        }
      } else if (is_func1(run)) {
        try {
          const res = (
            run as Func1Sync<R | T | Promise<R | T> | Thanable<R | T>, T>
          )(context)
          if (res instanceof Promise) {
            res.then(_ => done(undefined, context)).catch(done)
          } else if (is_thenable(res)) {
            res.then(_ => done(undefined, context)).catch(done)
          } else {
            done(undefined, context)
          }
        } catch (err) {
          processError(err, done)
        }
      } else {
        done(new Error(ERROR.signature))
      }
      break
    case 2:
      if (is_func2_async(run)) {
        try {
          ;(run as Func2Async<T | R, Error | undefined, T>)(err, context)
            .then(ctx => done(undefined, ctx))
            .catch(done)
        } catch (err) {
          processError(err, done)
        }
      } else if (is_func2(run)) {
        try {
          ;(run as Func2Sync<void, T, CallbackFunction<R | T>>)(context, done)
        } catch (err) {
          processError(err, done)
        }
      } else {
        done(new Error(ERROR.signature))
      }
      break
    case 3:
      if (is_func3(run) && !is_func3_async(run)) {
        try {
          ;(run as Func3Sync<void, Error, T, CallbackFunction<T | R>>)(
            err as Error,
            context,
            done,
          )
        } catch (err) {
          processError(err, done)
        }
      } else {
        done(new Error(ERROR.signature))
      }
      break
    default:
      done(new Error(ERROR.signature))
  }
}

function processError<T>(err: unknown, done: CallbackFunction<T>) {
  if (err instanceof Error) {
    done(err)
  } else if (typeof err == 'string') {
    done(new Error(err))
  } else {
    done(new Error(String(err)))
  }
}

function execute_rescue<T, R>(
  rescue: Rescue<T, R>,
  err: Error,
  context: T,
  done: (err?: Error) => void,
) {
  switch (rescue.length) {
    case 1:
      if (is_func1_async(rescue)) {
        try {
          rescue(err)
            .then(_ => done())
            .catch(done)
        } catch (err) {
          processError(err, done)
        }
      } else if (is_func1(rescue)) {
        try {
          const res = rescue(err)
          if (res instanceof Promise) {
            res.then(_ => done()).catch(done)
          } else if (is_thenable(res)) {
            res.then(_ => done()).catch(done)
          } else {
            done()
          }
        } catch (err) {
          processError(err, done)
        }
      } else {
        done(new Error(ERROR.signature))
      }
      break
    case 2:
      if (is_func2_async(rescue)) {
        try {
          rescue(err, context)
            .then(_ => done())
            .catch(done)
        } catch (err) {
          processError(err, done)
        }
      } else if (is_func2(rescue)) {
        try {
          const res = rescue(err, context)
          if (res instanceof Promise) {
            res.then(_ => done()).catch(done)
          } else if (is_thenable(res)) {
            res.then(_ => done()).catch(done)
          } else {
            done()
          }
          done()
        } catch (err) {
          processError(err, done)
        }
      } else {
        done(new Error(ERROR.signature))
      }
      break
    case 3:
      if (is_func3(rescue) && !is_func3_async(rescue)) {
        try {
          ;(rescue as Func3Sync<void, Error, T, CallbackFunction<R | T>>)(
            err,
            context,
            done,
          )
        } catch (err) {
          processError(err, done)
        }
      } else {
        done(new Error(ERROR.signature))
      }
      break
    default:
      done(new Error(ERROR.signature))
  }
}

function execute_validate<T>(
  validate: ValidateFunction<T>,
  context: T,
  done: CallbackFunction<boolean>,
) {
  switch (validate.length) {
    case 1:
      if (is_func1_async(validate)) {
        try {
          ;(validate as Func1Async<boolean, T>)(context)
            .then(res => done(undefined, res))
            .catch(err => done(err))
        } catch (err) {
          processError(err, done)
        }
      } else if (is_func1(validate)) {
        try {
          const res = (
            validate as Func1Sync<
              boolean | Promise<boolean> | Thanable<boolean>,
              T
            >
          )(context)
          if (res instanceof Promise) {
            res.then(res => done(undefined, res)).catch(err => done(err))
          } else if (is_thenable(res)) {
            res.then(res => done(undefined, res)).catch(err => done(err))
          } else {
            done(undefined, res)
          }
        } catch (err) {
          processError(err, done)
        }
      } else {
        done(new Error(ERROR.signature))
      }
      break
    case 2:
      if (is_func2(validate)) {
        try {
          validate(context, (err?: Error, res?: boolean) => {
            done(err, res)
          })
        } catch (err) {
          processError(err, done)
        }
      } else {
        done(new Error(ERROR.signature))
      }
      break
    default:
      done(new Error(ERROR.signature))
  }
}

function execute_ensure<T>(
  ensure: EnsureFunction<T>,
  context: T,
  done: CallbackFunction<T>,
) {
  switch (ensure.length) {
    case 1:
      if (is_func1_async(ensure)) {
        try {
          ;(ensure as Func1Async<T, T>)(context)
            .then(res => done(undefined, res))
            .catch(err => done(err))
        } catch (err) {
          processError(err, done)
        }
      } else if (is_func1(ensure)) {
        try {
          const res = (ensure as Func1Sync<T | Promise<T> | Thanable<T>, T>)(
            context,
          )
          if (res instanceof Promise) {
            res.then(res => done(undefined, res)).catch(err => done(err))
          } else if (is_thenable(res)) {
            res.then(res => done(undefined, res)).catch(err => done(err))
          } else {
            done(undefined, res)
          }
        } catch (err) {
          processError(err, done)
        }
      } else {
        done(new Error(ERROR.signature))
      }
      break
    case 2:
      if (is_func2(ensure)) {
        try {
          ensure(context, (err?: Error, ctx?: T) => {
            done(err, ctx)
          })
        } catch (err) {
          processError(err, done)
        }
      } else {
        done(new Error(ERROR.signature))
      }
      break
    default:
      done(new Error(ERROR.signature))
  }
}

export type EnsureParams<T, R> = {
  context: T
  callback: CallbackFunction<R> | undefined
  err: Error | undefined
  is_promise: boolean
}

function ensure_execute_params<T, R>(
  _err?: Error | T,
  _context?: T | CallbackFunction<R | T>,
  _callback?: CallbackFunction<R | T>,
): EnsureParams<T, R> {
  let err: Error | undefined,
    context: T,
    callback: CallbackFunction<R> | undefined,
    is_promise: boolean = false

  if (arguments.length == 1) {
    context = _err as T
    is_promise = true
    //promise
  } else if (arguments.length == 2) {
    if (typeof _context == 'function') {
      // callback
      context = _err as T
      err = undefined
      callback = _context as CallbackFunction<R>
    } else {
      //promise
      is_promise = true
      err = _err as Error
      context = _context as T
    }
  } else {
    // callback
    err = _err as Error
    context = _context as T
    callback = _callback as CallbackFunction<R>
    is_promise = false
  }

  return { context, callback, err, is_promise }
}

function can_fix_error<T, R>(run: RunPipelineConfig<T, R>) {
  return is_func2_async(run) || (is_func3(run) && !is_func3_async(run))
}

/**
 * breakin changes
 * - run function not bind to the context in case when there is more than 0 params
 */

// смотрим дальше
// контекст всегда мутабельный

// написать тесты для проверки всего и описать общий поток, если нужно

// результат функции может быть промисом в любом месте???
