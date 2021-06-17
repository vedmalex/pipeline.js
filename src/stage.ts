import { isAsyncFunction } from 'util/types'
import { ContextFactory, Context } from './context'
import { is_async } from './utils/is_async'
import { ErrorList } from './ErrorList'

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

export type Rescue<T extends object> =
  | ((err: Error) => void)
  | ((err: Error) => Promise<Context<T>>)
  | ((err: Error, context?: Context<T>) => void)
  | ((err: Error, context?: Context<T>) => Promise<Context<T>>)
  | ((err: Error, context?: Context<T>, callback?: CallbackFunction<T>) => void)

export type EnsureStage<T extends object> =
  | EnsureStagePromise<T>
  | EnsureStageCallback<T>

export type EnsureStagePromise<T extends object> = (
  context: Context<T>,
) => Promise<boolean>

export type EnsureStageCallback<T extends object> = (
  context: Context<T>,
  callback: CallbackFunction<T>,
) => void

export type ValidateFunction<T extends object> =
  | ((context: Context<T>) => boolean)
  | ((context: Context<T>) => Promise<boolean>)

export interface StageConfigValidate<T extends object> {
  name?: string
  rescue?: Rescue<T>
  validate?: ValidateFunction<T>
  run: RunPipelineConfig<T>
}
export interface StageConfigSchema<T extends object> {
  name?: string
  rescue?: Rescue<T>
  schema?: object
  run: RunPipelineConfig<T>
}

export interface StageConfigEnsure<T extends object> {
  name?: string
  ensure?: EnsureStage<T>
  rescue?: Rescue<T>
  run: RunPipelineConfig<T>
}

export type StageConfig<T extends object> =
  | StageConfigValidate<T>
  | StageConfigSchema<T>
  | StageConfigEnsure<T>

export class Stage<T extends object = {}> {
  // static createWithFunction<T extends object>(config: StageConfig<T>) {
  //   return new Stage<T>(config)
  // }
  // static createWithName<T extends object>(config: string) {
  //   return new Stage<T>(config)
  // }
  // static createWithSchema<T extends object>(config: StageConfigSchema<T>) {
  //   return new Stage<T>(config)
  // }
  // static createWithValidation<T extends object>(
  //   config: StageConfigValidate<T>,
  // ) {
  //   return new Stage<T>(config)
  // }
  protected config: StageConfig<T>
  constructor(config: string | StageConfig<T> | SingleStageFunction<T>) {
    this.config = {} as StageConfig<T>
    if (typeof config == 'string') {
      this.config.name = config
    } else if (typeof config == 'function') {
      this.config.run = config as SingleStageFunction<T>
    } else if (typeof config == 'object') {
      if (config.name) {
        this.config.name = config.name
      }
      if (config.rescue) {
        this.rescue = config.rescue
      }
      if (config.run) {
        this.config.run = config.run as RunPipelineConfig<T>
      }
      if (
        config.hasOwnProperty('ensure') &&
        config.hasOwnProperty('schema') &&
        config.hasOwnProperty('validate')
      ) {
        throw new Error('use either validate or schema or ensure')
      }
      if (config.hasOwnProperty('ensure')) {
        ;(this.config as StageConfigEnsure<T>).ensure = (
          config as StageConfigEnsure<T>
        ).ensure
      }
      if (config.hasOwnProperty('schema')) {
        ;(this.config as StageConfigSchema<T>).schema = (
          config as StageConfigSchema<T>
        ).schema
      }
      if (config.hasOwnProperty('schema')) {
        ;(this.config as StageConfigValidate<T>).validate = (
          config as StageConfigValidate<T>
        ).validate
      }
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

  public get reportName() {
    return `STG:${this.config.name ? this.config.name : ''}`
  }

  public get name() {
    return this.config.name
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
    if (err) return this.handleError(err, context, callback)
    this.run(context, callback)
  }

  run(context: Context<T>, callback: CallbackFunction<T>) {
    var eLen = this.config.ensure ? this.config.ensure.length : -1
    // run ensure if we have
    switch (eLen) {
      case 2:
        {
          let ensure = this.config.ensure as EnsureStageCallback<T>
          ensure(context, (_err: any, context: any) => {
            this.stage(new ErrorList([err, _err]), context, callback)
          })
        }
        break
      case 1:
        {
          let ensure = this.config.ensure as EnsureStagePromise<T>
          ensure(context)
            .then(res =>
              res
                ? this.stage(err, context, callback)
                : this.stage(
                    new Error('some validation is failed'),
                    context,
                    callback,
                  ),
            )
            .catch(err => this.stage(err, context, callback))
        }
        break
      default:
        this.ensure(context)
        this.stage(err, context, callback)
    }
  }

  stage(context: Context<T>, callback: CallbackFunction<T>) {
    const done = (err?: Error) => {
      this.doneIt(err, context, callback)
    }

    this.validate(context)

    switch (this.config.run.length) {
      // this is the context of the run function
      case 0:
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

  toString() {
    return '[pipeline Stage]'
  }

  protected ensure(context: Context<T>, callback: CallbackFunction<T>) {
    if (this.config.validate) {
      if (is_async(this.config.validate)) {
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
      callback(null, context)
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
