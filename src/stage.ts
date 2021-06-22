import {
  CallbackFunction,
  IStage,
  is_func2_async,
  is_func3,
  is_func3_async,
  is_thenable,
  Rescue,
  RunPipelineConfig,
  SingleStageFunction,
  StageConfig,
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
import { Func0Async, Func2Async, Func3Sync } from './utils/types'

const ERROR = {
  signature: 'unacceptable run method signature',
}

// make possibility to context be immutable for debug purposes

export class Stage<T, R = T> implements IStage<T> {
  public get config() {
    return this._config
  }
  protected _config: StageConfig<T>
  constructor(config: string | StageConfig<T> | SingleStageFunction<T>) {
    this._config = {} as StageConfig<T>
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
        this._config.run = config.run as RunPipelineConfig<T>
      }
      if (config.validate) {
        this._config.validate = config.validate
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
    return this._config.name
  }

  // может быть вызван как Promise
  // сделать все дубликаты и проверки методов для работы с промисами
  public execute(context: T): Promise<T>
  public execute(context: T, callback: CallbackFunction<T>)
  public execute(err: Error, context: T, callback: CallbackFunction<T>)
  public execute(
    _err?: Error | T,
    _context?: T | CallbackFunction<T>,
    _callback?: CallbackFunction<T>,
  ): void | Promise<T> {
    const { context, callback, err, is_promise } = ensure_execute_params(
      _err,
      _context,
      _callback,
    )
    if (is_promise) {
      return new Promise((res, rej) => {
        this.execute(err as Error, context as T, (err: Error, context: T) => {
          if (err) rej(err)
          else res(context)
        })
      })
    } else if (err && !can_fix_error(this._config.run)) {
      this.rescue(err, context, callback)
    } else {
      if (this._config.validate) {
        this.ensure(context, (err_: Error, ctx: T) => {
          if (err || err_) {
            if (!can_fix_error(this._config.run)) {
              this.rescue(new ErrorList([err, err_]), ctx, callback)
            } else {
              // обработка ошибок может происходить внутри функции
              this.run(new ErrorList([err, err_]), ctx, callback)
            }
          } else {
            this.run(null, ctx, callback)
          }
        })
      } else {
        this.run(null, context, callback)
      }
    }
  }

  protected stage(err: Error, context: T, callback: CallbackFunction<T>) {
    execute_callback(err, this._config.run, context, (err?: Error) => {
      if (err) {
        this.rescue(err, context, callback)
      } else {
        callback(null, context)
      }
    })
  }

  protected compiled: boolean
  public compile(rebuild: boolean = false) {
    if (this._config.compile) {
      this._config.compile.apply(this, rebuild)
      this.compiled = true
    } else if (!this.compiled || rebuild) {
      this.run = this.stage
      this.compiled = true
    }
  }
  // to be overridden by compile
  protected run: (err: Error, context: T, callback: CallbackFunction<T>) => void

  // объединение ошибок сделать
  protected rescue(
    err: Error | any,
    context: T,
    callback: CallbackFunction<T>,
  ) {
    if (err && !(err instanceof Error)) {
      if (typeof err == 'string') err = Error(err)
    }
    if (this._config.rescue) {
      execute_rescue(this._config.rescue, err, context, (_err?: Error) => {
        callback(new ErrorList([err, _err]), context)
      })
    } else {
      callback(err, context)
    }
  }

  public toString() {
    return '[pipeline Stage]'
  }

  protected ensure(context: T, callback: CallbackFunction<T>) {
    execute_validate(this._config.validate, context, (err, result) => {
      if (err) {
        callback(err, context)
      } else {
        if (result) {
          if ('boolean' === typeof result) {
            callback(null, context)
          } else if (
            Array.isArray(result) &&
            result.length > 0 &&
            typeof result[0] == 'string'
          ) {
            callback(new ErrorList(result), context)
          } else {
            // ensure works
            callback(null, result as T)
          }
        } else {
          callback(
            new Error(this.reportName + ' reports: T is invalid'),
            context,
          )
        }
      }
    })
  }
}

// может не являться async funciton но может вернуть промис, тогда тоже должен отработать как промис

function execute_callback<T>(
  err: Error,
  run: RunPipelineConfig<T>,
  context: T,
  done: (err?: Error | null, res?: T) => void,
) {
  switch (run.length) {
    // this is the context of the run function
    case 0:
      if (is_func0_async<T>(run)) {
        try {
          ;(run.bind(context) as Func0Async<T>)()
            .then(res => done(null, res || context))
            .catch(done)
        } catch (err) {
          done(err)
        }
      } else if (is_func0(run)) {
        try {
          const res = run.apply(context) as
            | void
            | Promise<void>
            | Thanable<void>
          if (res instanceof Promise) {
            res.then(_ => done(null, context)).catch(done)
          } else if (is_thenable(res)) {
            res.then(_ => done(null, context)).catch(done)
          } else {
            done(null, context)
          }
        } catch (err) {
          done(err)
        }
      }
      break
    case 1:
      if (is_func1_async(run)) {
        try {
          run(context)
            .then(_ => done())
            .catch(done)
        } catch (err) {
          done(err)
        }
      } else if (is_func1(run)) {
        try {
          const res = run(context)
          if (res instanceof Promise) {
            res.then(_ => done(null, context)).catch(done)
          } else if (is_thenable(res)) {
            res.then(_ => done(null, context)).catch(done)
          } else {
            done(null, context)
          }
        } catch (err) {
          done(err)
        }
      } else {
        done(new Error(ERROR.signature))
      }
      break
    case 2:
      if (is_func2_async(run)) {
        try {
          ;(run as Func2Async<void, Error, T>)(err, context)
            .then(_ => done())
            .catch(done)
        } catch (err) {
          done(err)
        }
      } else if (is_func2(run)) {
        try {
          run(context, done)
        } catch (err) {
          done(err)
        }
      } else {
        done(new Error(ERROR.signature))
      }
      break
    case 3:
      if (is_func3(run) && !is_func3_async(run)) {
        try {
          ;(run as Func3Sync<void, Error, T, CallbackFunction<T>>)(
            err as Error,
            context,
            done,
          )
        } catch (err) {
          done(err)
        }
      } else {
        done(new Error(ERROR.signature))
      }
      break
    default:
      done(new Error(ERROR.signature))
  }
}

function execute_rescue<T>(
  rescue: Rescue<T>,
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
          done(err)
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
          done(err)
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
          done(err)
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
          done(err)
        }
      } else {
        done(new Error(ERROR.signature))
      }
      break
    case 3:
      if (is_func3(rescue) && !is_func3_async(rescue)) {
        try {
          ;(rescue as Func3Sync<void, Error, T, CallbackFunction<T>>)(
            err,
            context,
            done,
          )
        } catch (err) {
          done(err)
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
  done: CallbackFunction<boolean | string[] | T>,
) {
  switch (validate.length) {
    case 1:
      if (is_func1_async(validate)) {
        try {
          validate(context)
            .then(res => done(null, res))
            .catch(err => done(err, false))
        } catch (err) {
          done(err, false)
        }
      } else if (is_func1(validate)) {
        try {
          const res = validate(context)
          if (res instanceof Promise) {
            res.then(res => done(null, res)).catch(err => done(err, false))
          } else if (is_thenable(res)) {
            res.then(res => done(null, res)).catch(err => done(err, false))
          } else {
            done(null, res)
          }
        } catch (err) {
          done(err, false)
        }
      } else {
        done(new Error(ERROR.signature), false)
      }
      break
    case 2:
      if (is_func2(validate)) {
        try {
          validate(context, (err, ctx) => {
            done(err, ctx)
          })
        } catch (err) {
          done(err, false)
        }
      } else {
        done(new Error(ERROR.signature), false)
      }
      break
    default:
      done(new Error(ERROR.signature), false)
  }
}

function ensure_execute_params<T>(
  _err: Error | T,
  _context: T | CallbackFunction<T>,
  _callback: CallbackFunction<T>,
) {
  let err: Error,
    context: T,
    callback: CallbackFunction<T>,
    is_promise: boolean = false

  if (arguments.length == 1) {
    context = _err as T
    is_promise = true
    //promise
  } else if (arguments.length == 2) {
    if (typeof _context == 'function') {
      // callback
      context = _err as T
      err = null
      callback = _context as CallbackFunction<T>
    } else {
      //promise
      is_promise = true
      err = _err as Error
      context = _context as T
    }
  } else if (arguments.length == 3) {
    // callback
    err = _err as Error
    context = _context as T
    callback = _callback
    is_promise = false
  }

  return { context, callback, err, is_promise }
}

function can_fix_error<T>(run: RunPipelineConfig<T>) {
  return is_func2_async(run) || (is_func3(run) && !is_func3_async(run))
}

/**
 * breakin changes
 * - ensure, validate, schema is dropped down
 * - run function not bind to the context in case when there is more than 0 params
 * - use external validation tools that always throw erros somehow
 */

// смотрим дальше
// контекст всегда мутабельный

// написать тесты для проверки всего и описать общий поток, если нужно

// результат функции может быть промисом в любом месте???
