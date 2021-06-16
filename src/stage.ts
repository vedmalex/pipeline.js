import { isAsyncFunction } from 'util/types'
import { ContextFactory, Context } from './context'

export type CallbackFunction<T extends object> = (
  err: Error | any,
  result?: Context<T> | any,
) => void

export type SingleStageFunction<T extends object> =
  | ((err: Error, context: Context<T>) => Promise<Context<T>>)
  | ((err: Error, context: Context<T>, callback: CallbackFunction<T>) => void)

export type RunPipelineConfig<T extends object> =
  | (() => void)
  | (() => Promise<void>)
  | ((context: Context<T>) => void)
  | ((context: Context<T>) => Promise<Context<T>>)
  | ((context: Context<T>, callback: CallbackFunction<T>) => void)
  | ((err: Error, context: Context<T>) => Promise<Context<T>>)
  | ((err: Error, context: Context<T>, callback: CallbackFunction<T>) => void)

export interface Rescue<T extends object> {
  (err: Error)
  (err: Error): Promise<Context<T>>
  (err: Error, context?: Context<T>)
  (err: Error, context?: Context<T>): Promise<Context<T>>
  (err: Error, context?: Context<T>, callback?: CallbackFunction<T>)
}

export interface EnsureStage<T extends object> {
  (context: Context<T>): Promise<boolean>
  (context: Context<T>, callback: CallbackFunction<T>): void
}

export interface ValidateFunction<T extends object> {
  (context: Context<T>): boolean
  (context: Context<T>): Promise<boolean>
}

export interface StageConfig<T extends object> {
  name?: string
  ensure?: EnsureStage<T>
  rescue?: Rescue<T>
  validate?: ValidateFunction<T>
  schema?: JSON
  run: RunPipelineConfig<T>
}

export class Stage<T extends object> {
  protected config: StageConfig<T>
  constructor(name: string)
  constructor(run: SingleStageFunction<T>)
  constructor(config: StageConfig<T>)
  constructor(
    config:
      | string
      | RunPipelineConfig<T>
      | StageConfig<T>
      | SingleStageFunction<T>,
  ) {
    this.config = {} as StageConfig<T>
    if (typeof config == 'string') {
      this.config.name = config
    } else if (typeof config == 'function') {
      this.config.run = config as SingleStageFunction<T>
    } else if (typeof config == 'object') {
      if (config.ensure) this.config.ensure = config.ensure
      if (config.name) this.config.name = config.name
      if (config.rescue) this.rescue = config.rescue
      if (config.run) this.config.run = config.run as RunPipelineConfig<T>
      if (config.schema && config.validate)
        throw new Error('use either validate or schema')
      if (config.schema) this.config.schema = config.schema
      if (config.validate) this.config.validate = config.validate
    }

    if (!this.config.name && this.config.run) {
      var match = this.config.run.toString().match(/function\s*(\w+)\s*\(/)

      if (match && match[1]) {
        this.config.name = match[1]
      } else {
        this.config.name = this.config.run.toString()
      }
    }
  }

  protected get reportName() {
    return `STG:${this.config.name ? this.config.name : ''}`
  }

  public get name() {
    return this.config.name
  }

  protected rescue(
    err?: Error | any,
    context?: Context<T>,
    callback?: CallbackFunction<T>,
  ) {
    if (typeof callback === 'function') {
      callback(err, context)
    } else {
      return err
    }
  }

  protected finishIt(
    err: Error | any,
    context: Context<T>,
    callback?: CallbackFunction<T>,
  ): void | Promise<Context<T>> {
    if (callback) {
      globalThis.process
        ? process.nextTick(() => callback(err, context))
        : globalThis.setImmediate
        ? setImmediate(() => callback(err, context))
        : setTimeout(() => callback(err, context), 0)
    } else {
      if (err) {
        return Promise.reject(err)
      } else return Promise.resolve(context)
    }
  }

  protected handleError(
    err: Error | any,
    context: Context<T>,
    callback: CallbackFunction<T>,
  ) {
    if (err && !(err instanceof Error)) {
      if ('string' === typeof err) err = Error(err)
    }

    var len = this.rescue ? this.rescue.length : -1
    switch (len) {
      case 0:
        this.finishIt(this.rescue(), context, callback)
        break

      case 1:
        this.finishIt(this.rescue(err), context, callback)
        break

      case 2:
        this.finishIt(this.rescue(err, context), context, callback)
        break

      case 3:
        this.rescue(err, context, function (err) {
          this.finishIt(err, context, callback)
        })
        break

      default:
        this.finishIt(err, context, callback)
    }
  }

  protected doneIt(
    err: Error | any,
    context: Context<T>,
    callback: CallbackFunction<T>,
  ) {
    if (err) {
      this.handleError(err, context, callback)
    } else {
      this.finishIt(undefined, context, callback)
    }
  }

  public execute(context: Context<T>, callback: CallbackFunction<T>)
  public execute(
    _err?: Error | Context<T>,
    _context?: Context<T> | CallbackFunction<T>,
    _callback?: CallbackFunction<T>,
  ) {
    const { context, callback, err } = ensure_execute_params(
      _err,
      _context,
      _callback,
    )

    this.run(err, context, callback)
  }

  toString() {
    return '[pipeline Stage]'
  }

  stage(err: Error | any, context: Context<T>, callback: CallbackFunction<T>) {
    const done = (err?: Error) => {
      this.doneIt(err, context, callback)
    }

    switch (this.config.run.length) {
      // this is the context of the run function
      case 0:
        if (err) return this.handleError(err, context, callback)
        try {
          this.config.run.apply(context)
          done()
        } catch (err) {
          return this.handleError(err, context, callback)
        }
        break
      case 1:
        if (err) return this.handleError(err, context, callback)
        try {
          const val = this.config.run.bind(this)

          val(context)
          done()
        } catch (er) {
          return this.handleError(er, context, callback)
        }
        break
      case 2:
        if (err) return this.handleError(err, context, callback)
        try {
          const val = this.config.run.bind(this)

          val(context, done)
        } catch (er) {
          return this.handleError(er, context, callback)
        }
        break
      case 3:
        try {
          const val = this.config.run.bind(this)

          val(err, context, done)
        } catch (er) {
          this.handleError(er, context, callback)
        }
        break
      default:
        this.handleError(
          new Error('unacceptable run method signature'),
          context,
          callback,
        )
    }
  }

  run(err: Error | any, context: Context<T>, callback: CallbackFunction<T>) {
    var eLen = this.config.ensure ? this.config.ensure.length : -1
    // run ensure if we have
    switch (eLen) {
      case 2:
        this.config.ensure(context, (err: any, context: any) => {
          this.stage(err, context, callback)
        })
        break
      case 1:
        this.config
          .ensure(context)
          .then(res =>
            res
              ? this.stage(null, context, callback)
              : this.stage(
                  new Error('some validation is failed'),
                  context,
                  callback,
                ),
          )
          .catch(err => this.stage(err, context, callback))
        break
      default:
        // run default validation of context
        this.validate(context, (err, context) => {
          this.stage(err, context, callback)
        })
    }
  }

  protected validate(context: Context<T>, callback: CallbackFunction<T>) {
    if (this.config.validate) {
      if (isAsync(this.config.validate)) {
        const res = this.config.validate(context)
        if (typeof res == 'object') {
          ;(res as Promise<boolean>).then(res =>
            this.isValid(res, callback, context),
          )
        } else {
          this.isValid(res, callback, context)
        }
      } else {
        this.isValid(this.config.validate(context), callback, context)
      }
    } else {
      this.isValid(true, callback, context)
    }
  }

  private isValid(
    isValid: any,
    callback: CallbackFunction<T>,
    context: Context<T>,
  ) {
    if (isValid) {
      if ('boolean' === typeof isValid) {
        callback(null, context)
      } else {
        callback(isValid, context)
      }
    } else {
      callback(new Error(this.reportName + ' reports: Context<T> is invalid'))
    }
  }
}

function ensure_execute_params<T extends object>(
  err: Error | Context<T>,
  context: Context<T> | CallbackFunction<T>,
  callback: CallbackFunction<T>,
) {
  if (context instanceof Function) {
    callback = context
    context = err as Context<T>
    err = undefined
  } else if (!context && !(err instanceof Error)) {
    context = err as Context<T>
    err = undefined
    callback = undefined
  }
  return { context, callback, err }
}

export function isAsync(inp: any): boolean {
  return inp?.constructor?.name == 'AsyncFunction'
}

/**
 * Промисы
 * здесь можно и нужно разработать вариант для всех случаев и он должен быть обратно совместимый
 * с "известным" переходом на другой
 *
 *  все методы принимают промисы и все работают с коллбэками
 * переделать все стандартные методы на работу с промисами или yield нужно!!! подумать
 */
