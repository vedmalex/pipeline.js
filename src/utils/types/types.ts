import { JSONSchemaType } from 'ajv'
import { isStage } from '../../stage'
import { ComplexError, CreateError } from '../ErrorList'

import Ajv from 'ajv'

import ajvErrors from 'ajv-errors'
import ajvFormats from 'ajv-formats'
import ajvKeywords from 'ajv-keywords'
import { empty_run } from '../empty_run'
import { ContextType } from 'src/context'

export type StageObject = object

export type EvaluateFunction<R> = (ctx: R) => boolean

export type CallbackFunction<R> = (err?: any, res?: R) => void

export function isCallback<R>(inp?: unknown): inp is CallbackFunction<R> {
  if (typeof inp === 'function' && !is_async_function(inp)) {
    return inp.length <= 2
  } else return false
}

export function isExternalCallback<T>(inp?: unknown): inp is CallbackFunction<T> {
  if (typeof inp === 'function' && !is_async_function(inp)) {
    return inp.length <= 2
  } else return false
}

export function is_async_function(inp?: unknown) {
  if (typeof inp == 'function') return inp?.constructor?.name == 'AsyncFunction'
  else return false
}

export function is_func1Callback<R>(inp?: unknown): inp is Func1Sync<R> {
  return typeof inp === 'function' && inp?.length == 1
}

// /все типы должны быть правильно override cделаны

export type Func0Sync<R> = () => R
export type Func1Sync<R> = (ctx: R) => R
export type Func2Sync<R> = (ctx: R, done: CallbackFunction<R>) => R
export type Func3Sync<R> = (err: unknown, ctx: R, p3: CallbackFunction<R>) => void

export type FuncSync<R> = Func0Sync<R> | Func1Sync<R> | Func2Sync<R> | Func3Sync<R>

export type Func0Async<R> = () => Promise<R>
export type Func1Async<R> = (p1: R) => Promise<R>
export type Func2Async<R> = (p1: unknown, p2: R) => Promise<R>
export type Func3Async<R> = (p1: unknown, p2: unknown, p3: unknown) => Promise<R>

export type FuncAsync<R> = Func0Async<R> | Func1Async<R> | Func2Async<R> | Func3Async<R>

export type Func0<R> = Func0Sync<R> | Func0Async<R>
export type Func1<R> = Func1Sync<R> | Func1Async<R>
export type Func2<R> = Func2Sync<R> | Func2Async<R>
export type Func3<R> = Func3Sync<R> | Func3Async<R>

export type Func<R> = FuncSync<R> | FuncAsync<R>

export function is_async<R>(inp?: unknown): inp is FuncAsync<R> {
  return is_async_function(inp)
}

export function is_func0<R>(inp?: unknown): inp is Func0Sync<R> {
  return typeof inp === 'function' && inp?.length === 0
}

export function is_func1<R>(inp?: unknown): inp is Func1Sync<R> {
  return typeof inp === 'function' && inp?.length === 1
}

export function is_func2<R>(inp?: unknown): inp is Func2Sync<R> {
  return typeof inp === 'function' && inp?.length === 2
}

export function is_func3<R>(inp?: unknown): inp is Func3Sync<R> {
  return typeof inp === 'function' && inp?.length === 3
}

export function is_func0_async<R>(inp: unknown): inp is Func0Async<R> {
  return is_async<R>(inp) && inp?.length === 0
}

export function is_func1_async<R>(inp: unknown): inp is Func1Async<R> {
  return is_async<R>(inp) && inp?.length === 1
}

export function is_func2_async<R>(inp?: unknown): inp is Func2Async<R> {
  return is_async(inp) && inp?.length === 2
}

export function is_func3_async<R>(inp?: unknown): inp is Func3Async<R> {
  return is_async(inp) && inp?.length === 3
}

export type Thanable<T> = {
  then: Promise<T>['then']
  catch: Promise<T>['catch']
}

export function is_thenable<T>(inp?: any): inp is Thanable<T> {
  return typeof inp == 'object' && 'then' in inp
}

export type Possible<T> = T | undefined | null

export type SingleStageFunction<R> = Func2Async<R> | Func3Sync<R>

export function isSingleStageFunction<R>(inp?: unknown): inp is SingleStageFunction<R> {
  return is_func2_async<R>(inp) || is_func3<R>(inp)
}

export type ValidateFunction =
  // will throw error
  | (() => boolean)
  | ((value: unknown) => boolean)
  // will reject with error
  | ((value: unknown) => Promise<boolean>)
  | ((value: unknown) => Thanable<boolean>)
  // will return error in callback
  | ((value: unknown, callback: CallbackFunction<boolean>) => void)

export function isValidateFunction(inp: any): inp is ValidateFunction {
  return is_func1(inp) || is_func1_async(inp) || is_func2(inp)
}

export type CustomRun0SyncVoid = () => void
export type CustomRun0Sync<R> = () => R
export type CustomRun0Async<R> = () => Promise<R>
export type CustomRun1Sync<R> = (ctx: R) => R
export type CustomRun1Async<R> = (ctx: R) => Promise<R>
export type CustomRun2Async<R> = (err: any, ctx: R) => Promise<R>
export type CustomRun2Callback<R> = (ctx: R, done: CallbackFunction<R>) => void
export type CustomRun3Callback<R> = (err: any, ctx: R, done: CallbackFunction<R>) => void

export type RunPipelineFunction<R> =
  | CustomRun0Sync<R>
  | CustomRun0Sync<R>
  | CustomRun0Async<R>
  | CustomRun1Async<R>
  | CustomRun1Sync<R>
  | CustomRun2Callback<R>
  | CustomRun2Async<R>
  | CustomRun3Callback<R>

export function isCustomRun0Sync<R>(inp: unknown): inp is CustomRun0Sync<R> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 0
}
export function isCustomRun0Async<R>(inp: unknown): inp is CustomRun0Async<R> {
  return is_async_function(inp) && typeof inp === 'function' && inp.length === 0
}
export function isCustomRun1Async<R>(inp: unknown): inp is CustomRun1Async<R> {
  return is_async_function(inp) && typeof inp === 'function' && inp.length === 1
}
export function isCustomRun1Sync<R>(inp: unknown): inp is CustomRun1Sync<R> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 1
}
export function isCustomRun2Callback<R>(inp: unknown): inp is CustomRun2Callback<R> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 2
}
export function isCustomRun2Async<R>(inp: unknown): inp is CustomRun2Async<R> {
  return is_async_function(inp) && typeof inp === 'function' && inp.length === 2
}
export function isCustomRun3Callback<R>(inp: unknown): inp is CustomRun3Callback<R> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 3
}

export function isRunPipelineFunction<R>(inp: any): inp is RunPipelineFunction<R> {
  return (
    isCustomRun0Async(inp) ||
    isCustomRun1Async(inp) ||
    isCustomRun1Sync(inp) ||
    isCustomRun2Async(inp) ||
    isCustomRun0Sync(inp) ||
    isCustomRun2Callback(inp) ||
    isCustomRun3Callback(inp)
  )
}

export type Rescue1Sync<R> = (ctx: R) => any
export type Rescue1ASync<R> = (ctx: R) => Promise<void>
export type Rescue2ASync<R> = (err: unknown, ctx: R) => Promise<void>
export type Rescue2Sync<R> = (err: unknown, ctx: R) => R
export type Rescue3Callback<R> = (err: unknown, ctx: R, done: CallbackFunction<R>) => void

export type Rescue<R> =
  // context is applied as this
  | Rescue1Sync<R>
  | Rescue1ASync<R>
  // not applied as this
  | Rescue2ASync<R>
  | Rescue2Sync<R>
  | Rescue3Callback<R>

export function isRescue1Sync<R>(inp: unknown): inp is Rescue1Sync<R> {
  return typeof inp == 'function' && inp.length == 1
}

export function isRescue1ASync<R>(inp: unknown): inp is Rescue1ASync<R> {
  return is_async_function(inp) && typeof inp === 'function' && inp.length == 1
}

export function isRescue2ASync<R>(inp: unknown): inp is Rescue2ASync<R> {
  return is_async_function(inp) && typeof inp === 'function' && inp.length == 2
}

export function isRescue3Callback<R>(inp: unknown): inp is Rescue3Callback<R> {
  return typeof inp == 'function' && inp.length == 3
}

export function isRescue2Sync<R>(inp: unknown): inp is Rescue2Sync<R> {
  return typeof inp == 'function' && inp.length == 2
}

export function isRescue<R>(inp: unknown): inp is Rescue<R> {
  return (
    isRescue1ASync(inp) || isRescue1Sync(inp) || isRescue2ASync(inp) || isRescue3Callback(inp) || isRescue2Sync(inp)
  )
}

export type ValidateSync<R> = (ctx: R) => R
export type ValidateAsync<R> = (ctx: R) => Promise<R>
export type ValidateCallback<R> = (ctx: R, done: CallbackFunction<R>) => void

export type Validate<R> =
  // context is applied as this
  | ValidateSync<R>
  | ValidateAsync<R>
  // not applied as this
  | ValidateCallback<R>

export function isValidateSync<R>(inp: unknown): inp is ValidateSync<R> {
  return typeof inp == 'function' && inp.length == 1
}

export function isValidateAsync<R>(inp: unknown): inp is ValidateAsync<R> {
  return is_async_function(inp) && typeof inp === 'function' && inp.length == 1
}

export function isValidateCallback<R>(inp: unknown): inp is ValidateCallback<R> {
  return typeof inp == 'function' && inp.length == 3
}

export function isValidate<R>(inp: unknown): inp is Validate<R> {
  return isValidateAsync(inp) || isValidateSync(inp) || isValidateCallback(inp)
}

export type Callback0Sync<R> = () => R
export type Callback0Async<R> = () => Promise<R>
export type Callback1Sync<R> = (ctx: R) => R
export type Callback1Async<R> = (ctx: R) => Promise<R>
export type Callback2Async<R> = (err: unknown, ctx: R) => Promise<R>
export type Callback2Callback<R> = (ctx: R, done: CallbackFunction<R>) => void
export type Callback3Callback<R> = (err: unknown, ctx: R, done: CallbackFunction<R>) => void

export type StageCallback<R> =
  | Callback0Sync<R>
  | Callback0Async<R>
  | Callback1Async<R>
  | Callback1Sync<R>
  | Callback2Callback<R>
  | Callback2Async<R>
  | Callback3Callback<R>

export function isCallback0Sync<R>(inp: unknown): inp is Callback0Sync<R> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 0
}
export function isCallback0Async<R>(inp: unknown): inp is Callback0Async<R> {
  return is_async_function(inp) && typeof inp === 'function' && inp.length === 0
}
export function isCallback1Async<R>(inp: unknown): inp is Callback1Async<R> {
  return is_async_function(inp) && typeof inp === 'function' && inp.length === 1
}
export function isCallback1Sync<R>(inp: unknown): inp is Callback1Sync<R> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 1
}
export function isCallback2Callback<R>(inp: unknown): inp is Callback2Callback<R> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 2
}
export function isCallback2Async<R>(inp: unknown): inp is Callback2Async<R> {
  return is_async_function(inp) && typeof inp === 'function' && inp.length === 2
}
export function isCallback3Callback<R>(inp: unknown): inp is Callback3Callback<R> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 3
}

export function isStageCallbackFunction<R>(inp: any): inp is StageCallback<R> {
  return (
    isCallback0Async(inp) ||
    isCallback1Async(inp) ||
    isCallback1Sync(inp) ||
    isCallback2Async(inp) ||
    isCallback0Sync(inp) ||
    isCallback2Callback(inp) ||
    isCallback3Callback(inp)
  )
}

export type EnsureSync<R> = (ctx: R) => R
export type EnsureAsync<R> = (ctx: R) => Promise<R>
export type EnsureCallback<R> = (ctx: R, done: CallbackFunction<R>) => void

// validate and ensure
export type EnsureFunction<R> =
  // will throw error
  | EnsureSync<R>
  // will refect with error
  | EnsureAsync<R>
  // will return error in callback
  | EnsureCallback<R>

export function isEnsureSync<R>(inp: unknown): inp is EnsureSync<R> {
  return typeof inp == 'function' && inp.length == 1
}

export function isEnsureAsync<R>(inp: unknown): inp is EnsureAsync<R> {
  return is_async_function(inp) && typeof inp === 'function' && inp.length == 1
}

export function isEnsureCallback<R>(inp: unknown): inp is EnsureCallback<R> {
  return typeof inp == 'function' && inp.length == 2
}

export function isEnsureFunction<R>(inp: unknown): inp is EnsureFunction<R> {
  return isEnsureAsync(inp) || isEnsureSync(inp) || isEnsureCallback(inp)
}

export interface StageConfig<R> {
  run?: RunPipelineFunction<R>
  name?: string
  rescue?: Rescue<R>
  schema?: JSONSchemaType<R>
  ensure?: EnsureFunction<R>
  validate?: ValidateFunction
  compile?(rebuild: boolean): StageRun<R>
  precompile?(): void
}

export interface PipelineConfig<R> extends StageConfig<R> {
  stages: Array<AnyStage<R> | RunPipelineFunction<R>>
}

export interface ParallelConfig<R, T> extends StageConfig<R> {
  stage: AllowedStageStored<R, StageConfig<R>>
  split?: (ctx: ContextType<R>) => T[]
  combine?: ((ctx: ContextType<R>, children: T[]) => R) | ((ctx: ContextType<R>, children: T[]) => unknown)
}

export function isStageRun<R>(inp: unknown): inp is StageRun<R> {
  return typeof inp === 'function' && inp?.length == 3
}

export type StageRun<R> = (err: unknown, context: unknown, callback: CallbackFunction<R>) => void

export type AsynStageRun<R> = (err: unknown, context: unknown) => Promise<R>

export type AllowedStageStored<R, CONFIG extends StageConfig<R>> = CONFIG | RunPipelineFunction<R> | AnyStage<R>

export type AllowedStage<R, CONFIG extends StageConfig<R>> = string | AllowedStageStored<R, CONFIG>

export function isAllowedStage<R, C extends StageConfig<R>>(inp: any): inp is AllowedStage<R, C> {
  return isRunPipelineFunction(inp) || isAnyStage(inp) || typeof inp == 'object' || typeof inp == 'string'
}

export function getStageConfig<R, C extends StageConfig<R>>(config: AllowedStage<R, C>): C | AnyStage<R> {
  let result: C = {} as C
  if (typeof config == 'string') {
    result.name = config
  } else if (isAnyStage(config)) {
    return config
  } else if (isRunPipelineFunction<R>(config)) {
    result.run = config
    result.name = getNameFrom<R, C>(result)
  } else {
    if (config.name) {
      result.name = config.name
    }
    if (isRescue(config.rescue)) {
      result.rescue = config.rescue
    }
    if (isRunPipelineFunction(config.run)) {
      result.run = config.run
    }
    if (config.validate && config.schema) {
      throw CreateError('use only one `validate` or `schema`')
    }
    if (config.ensure && config.schema) {
      throw CreateError('use only one `ensure` or `schema`')
    }
    if (config.ensure && config.validate) {
      throw CreateError('use only one `ensure` or `validate`')
    }
    if (isValidateFunction(config.validate)) {
      result.validate = config.validate
    }
    if (isEnsureFunction(config.ensure)) {
      result.ensure = config.ensure
    }
    if (config.compile) {
      result.compile = config.compile
    }
    if (config.precompile) {
      result.precompile = config.precompile
    }
    if (config.schema) {
      result.schema = config.schema
      const ajv = new Ajv({ allErrors: true })
      ajvFormats(ajv)
      ajvErrors(ajv, { singleError: true })
      ajvKeywords(ajv)
      const validate = ajv.compile(result.schema)
      result.validate = (ctx: unknown): boolean => {
        if (!validate(ctx) && validate.errors) {
          throw CreateError(ajv.errorsText(validate.errors))
        } else return true
      }
    }
    if (!config.name) {
      result.name = getNameFrom<R, C>(config)
    }
  }
  return result
}

export function getNameFrom<R, C extends StageConfig<R>>(config: C): string {
  let result: string = ''
  if (!config.name && config.run) {
    var match = config.run.toString().match(/function\s*(\w+)\s*\(/)
    if (match && match[1]) {
      result = match[1]
    } else {
      result = config.run.toString()
    }
  } else {
    result = config.name ?? ''
  }
  return result
}

export type AllowedPipeline<R> = AllowedStage<R, PipelineConfig<R>> | Array<RunPipelineFunction<R> | AnyStage<R>>

export function getPipelinConfig<R, C extends PipelineConfig<R>>(config: AllowedPipeline<R>): C {
  if (Array.isArray(config)) {
    return {
      stages: config.map((item): AnyStage<R> | RunPipelineFunction<R> => {
        if (isRunPipelineFunction(item)) {
          return item as RunPipelineFunction<R>
        } else if (isAnyStage(item)) {
          return item
        } else {
          throw CreateError('not suitable type for array in pipeline')
        }
      }),
    } as C
  } else {
    const res: PipelineConfig<R> | AnyStage<R> = getStageConfig<R, PipelineConfig<R>>(config)
    if (isAnyStage(res)) {
      return { stages: [res] } as C
    } else if (typeof config == 'object' && !isAnyStage(config)) {
      if (config.run && config.stages?.length > 0) {
        throw CreateError(" don't use run and stage both ")
      }
      if (config.run) {
        res.stages = [config.run]
      }
      if (config.stages) {
        res.stages = config.stages
      }
    } else if (typeof config == 'function' && res.run) {
      res.stages = [res.run]
      delete res.run
    }
    if (!res.stages) res.stages = []
    return res as C
  }
}

export function getParallelConfig<R, T, C extends ParallelConfig<R, T>>(config: AllowedStage<R, C>): C {
  const res = getStageConfig<R, ParallelConfig<R, T>>(config)
  if (isAnyStage(res) || isRunPipelineFunction(res)) {
    return { stage: res } as C
  } else if (typeof config == 'object' && !isAnyStage(config)) {
    const r = res
    if (config.run && config.stage) {
      throw CreateError("don't use run and stage both")
    }
    if (config.split) {
      r.split = config.split
    }
    if (config.combine) {
      r.combine = config.combine
    }
    if (config.stage) {
      r.stage = config.stage
    }
    if (config.run) {
      r.stage = config.run
    }
  } else if (typeof config == 'function' && res.run) {
    res.stage = res.run as RunPipelineFunction<R>
    delete res.run
  }
  return res as C
}

export function getEmptyConfig<R, C extends StageConfig<R>>(config: AllowedStage<R, C>): AnyStage<R> | C {
  const res = getStageConfig(config)

  if (isAnyStage(res)) {
    return res
  } else {
    res.run = empty_run as RunPipelineFunction<R>
  }

  return res
}

export interface WrapConfig<R, T> extends StageConfig<R> {
  stage: AllowedStageStored<R, StageConfig<R>>
  prepare?: (ctx: ContextType<R>) => T
  finalize?: ((ctx: R, retCtx: T) => R) | ((ctx: R, retCtx: T) => void)
}

export function getWrapConfig<R, T, C extends WrapConfig<R, T>>(config: AllowedStage<R, C>): C {
  const res = getStageConfig(config)
  if (isAnyStage(res)) {
    return { stage: res } as C
  } else if (typeof config == 'object' && !isAnyStage(config)) {
    if (config.run && config.stage) {
      throw CreateError("don't use run and stage both")
    }
    if (config.run) {
      res.stage = config.run as RunPipelineFunction<R>
    }
    if (config.stage) {
      res.stage = config.stage
    }
    if (config.finalize) {
      res.finalize = config.finalize
    }
    if (config.prepare) {
      res.prepare = config.prepare
    }
    res.prepare = config.prepare
  }
  return res
}

export interface TimeoutConfig<R> extends StageConfig<R> {
  timeout?: number | ((ctx: R) => number)
  stage?: AnyStage<R> | RunPipelineFunction<R>
  overdue?: AnyStage<R> | RunPipelineFunction<R>
}

export function getTimeoutConfig<R, C extends TimeoutConfig<R>>(config: AllowedStage<R, C>): C {
  const res = getStageConfig(config)
  if (isAnyStage(res)) {
    return { stage: res } as C
  } else if (typeof config == 'object' && !isAnyStage(config)) {
    if (config.run && config.stage) {
      throw CreateError("don't use run and stage both")
    }
    if (config.run) {
      res.stage = config.run
    }
    if (config.stage) {
      res.stage = config.stage
    }
    res.timeout = config.timeout
    res.overdue = config.overdue
  } else if (typeof config == 'function' && res.run) {
    res.stage = res.run
    delete res.run
  }
  return res
}

export interface IfElseConfig<R> extends StageConfig<R> {
  condition?: boolean | ValidateFunction
  success?: AnyStage<R> | RunPipelineFunction<R>
  failed?: AnyStage<R> | RunPipelineFunction<R>
}

export function getIfElseConfig<R, C extends IfElseConfig<R>>(config: AllowedStage<R, C>): C {
  const res = getStageConfig<R, C>(config)
  if (isAnyStage(res)) {
    return { success: res } as C
  } else if (typeof config == 'object' && !isAnyStage(config)) {
    if (config.run && config.success) {
      throw CreateError("don't use run and stage both")
    }
    if (config.run) {
      res.success = config.run
    }
    if (config.success) {
      res.success = config.success
    }
    if (config.condition) {
      res.condition = config.condition
    } else {
      res.condition = true
    }
    if (config.failed) {
      res.failed = config.failed
    } else {
      res.failed = empty_run as RunPipelineFunction<R>
    }
  } else if (typeof config == 'function' && res.run) {
    res.success = res.run
    res.failed = empty_run as RunPipelineFunction<R>
    res.condition = true
    delete res.run
  } else {
    res.success = empty_run as RunPipelineFunction<R>
  }
  return res
}

export interface AnyStage<R> {
  get reportName(): string
  get name(): string
  toString(): string
  execute<T>(context: unknown): Promise<T>
  execute<T>(context: unknown, callback: CallbackFunction<R & T>): void
  execute<T>(err: any, context: R, callback: CallbackFunction<R & T>): void
  execute<T>(_err?: any, _context?: R, _callback?: CallbackFunction<R & T>): void | Promise<T>
}

export function isAnyStage<R>(obj: unknown): obj is AnyStage<R> {
  return isStage(obj)
}

export interface DoWhileConfig<R, T> extends StageConfig<R> {
  stage: AllowedStageStored<R, StageConfig<R>>
  split?: (ctx: ContextType<R>, iter: number) => T
  reachEnd?: (err: unknown, ctx: ContextType<R>, iter: number) => unknown
}

export function getDoWhileConfig<R, T, C extends DoWhileConfig<R, T>>(
  _config: AnyStage<R> | C | SingleStageFunction<R>,
): C {
  let config: C = {} as C
  if (isAnyStage(_config)) {
    config.stage = _config
  } else if (typeof _config == 'function') {
    config.stage = _config
  } else {
    if (_config?.run && _config?.stage) {
      throw CreateError('use or run or stage, not both')
    }

    if (_config?.stage) {
      config.stage = _config.stage
    }

    if (_config?.split instanceof Function) {
      config.split = _config.split
    }

    if (_config?.reachEnd instanceof Function) {
      config.reachEnd = _config.reachEnd
    }
  }
  return config
}

export interface RetryOnErrorConfig<R, T> extends StageConfig<R> {
  stage?: AnyStage<R> | RunPipelineFunction<R>
  retry?: number | (<T>(p1?: ComplexError, p2?: T, p3?: number) => boolean)
  backup?: (ctx: R) => T
  restore?: ((ctx: R, backup: T) => R) | ((ctx: R, backup: T) => void)
}

export function getRetryOnErrorConfig<R, T, C extends RetryOnErrorConfig<R, T>>(config: AllowedStage<R, C>): C {
  const res = getStageConfig(config)
  if (isAnyStage(res)) {
    return { stage: res } as C
  } else if (typeof config == 'object' && !isAnyStage(config)) {
    if (config.run && config.stage) {
      throw CreateError("don't use run and stage both")
    }
    if (config.run) {
      res.stage = config.run
    }
    if (config.stage) {
      res.stage = config.stage
    }
    if (config.backup) {
      res.backup = config.backup
    }
    if (config.restore) {
      res.restore = config.restore
    }
    if (config.retry) {
      if (typeof config.retry !== 'function') {
        config.retry *= 1 // To get NaN is wrong type
      }
      res.retry = config.retry
    }
    if (!res.retry) res.retry = 1
  } else if (typeof config == 'function' && res.run) {
    res.stage = res.run
    delete res.run
  }
  return res
}
