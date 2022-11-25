import { JSONSchemaType } from 'ajv'
import { Stage } from '../stage'
import { CreateError, ComplexError } from './ErrorList'

import Ajv from 'ajv'

import ajvErrors from 'ajv-errors'
import ajvFormats from 'ajv-formats'
import ajvKeywords from 'ajv-keywords'
import { DoWhile } from '../dowhile'
import { Empty } from '../empty'
import { IfElse } from '../ifelse'
import { MultiWaySwitch } from '../multiwayswitch'
import { Parallel } from '../parallel'
import { Pipeline } from '../pipeline'
import { RetryOnError } from '../retryonerror'
import { Sequential } from '../sequential'
import { Timeout } from '../timeout'
import { Wrap } from '../wrap'
import { empty_run } from './empty_run'

export type StageObject = Record<string | symbol | number, any>

export type CallbackFunction<T> =
  | (() => void)
  | ((err?: Possible<ComplexError>) => void)
  | ((err?: Possible<ComplexError>, res?: T) => void)

export type CallbackExternalFunction<T> =
  | (() => void)
  | ((err?: Possible<Error>) => void)
  | ((err?: Possible<Error>, res?: T) => void)

export function isCallback<T>(inp?: unknown): inp is CallbackFunction<T> {
  if (typeof inp === 'function' && !is_async_function(inp)) {
    return inp.length <= 2
  } else return false
}

export function is_async_function(inp?: unknown) {
  if (typeof inp == 'function') return inp?.constructor?.name == 'AsyncFunction'
  else return false
}

export function is_func1Callbacl<R, P1>(
  inp?: Function,
): inp is Func1Sync<R, P1> {
  return inp?.length == 1
}

// /все типы должны быть правильно override cделаны

export type Func0Sync<R> = () => R
export type Func1Sync<R, P1> = (p1: P1) => R
export type Func2Sync<R, P1, P2> = (p1: P1, p2: P2) => R
export type Func3Sync<R, P1, P2, P3> = (p1: P1, p2: P2, p3: P3) => R

export type FuncSync<R, P1 = void, P2 = void, P3 = void> =
  | Func0Sync<R>
  | Func1Sync<R, P1>
  | Func2Sync<R, P1, P2>
  | Func3Sync<R, P1, P2, P3>

export type Func0Async<R> = Func0Sync<Promise<R>>
export type Func1Async<R, P1> = Func1Sync<Promise<R>, P1>
export type Func2Async<R, P1, P2> = Func2Sync<Promise<R>, P1, P2>
export type Func3Async<R, P1, P2, P3> = Func3Sync<Promise<R>, P1, P2, P3>

export type FuncAsync<R, P1, P2, P3> =
  | Func0Async<R>
  | Func1Async<R, P1>
  | Func2Async<R, P1, P2>
  | Func3Async<R, P1, P2, P3>

export type Func0<R> = Func0Sync<R> | Func0Async<R>
export type Func1<R, P1> = Func1Sync<R, P1> | Func1Async<R, P1>
export type Func2<R, P1, P2> = Func2Sync<R, P1, P2> | Func2Async<R, P1, P2>
export type Func3<R, P1, P2, P3> =
  | Func3Sync<R, P1, P2, P3>
  | Func3Async<R, P1, P2, P3>

export type Func<R, P1, P2, P3> =
  | FuncSync<R, P1, P2, P3>
  | FuncAsync<R, P1, P2, P3>

export function is_async<R, P1 = void, P2 = void, P3 = void>(
  // inp: Func<R, P1, P2, P3>,
  inp?: Function,
): inp is FuncAsync<R, P1, P2, P3> {
  return is_async_function(inp)
}

export function is_func0<R>(inp?: Function): inp is Func0Sync<R> {
  return inp?.length == 0
}

export function is_func1<R, P1>(inp?: Function): inp is Func1Sync<R, P1> {
  return inp?.length == 1
}

export function is_func2<R, P1, P2>(
  inp?: Function,
): inp is Func2Sync<R, P1, P2> {
  return inp?.length == 2
}

export function is_func3<R, P1, P2, P3>(
  inp?: Function,
): inp is Func3Sync<R, P1, P2, P3> {
  return inp?.length == 3
}

export function is_func0_async<T>(inp: Function): inp is Func0Async<T> {
  return is_async(inp) && is_func0(inp)
}

export function is_func1_async<R, P1>(inp: Function): inp is Func1Async<R, P1> {
  return is_async(inp) && is_func1(inp)
}

export function is_func2_async<R, P1, P2>(
  inp?: Function,
): inp is Func2Async<R, P1, P2> {
  return is_async(inp) && is_func2(inp)
}

export function is_func3_async<R, P1, P2, P3>(
  inp?: Function,
): inp is Func3Async<R, P1, P2, P3> {
  return is_async(inp) && is_func3(inp)
}

export type Thanable<T> = {
  then: Promise<T>['then']
  catch: Promise<T>['catch']
}

export function is_thenable<T>(inp?: any): inp is Thanable<T> {
  return typeof inp == 'object' && 'then' in inp
}

export type Possible<T> = T | undefined | null

export type SingleStageFunction<T extends StageObject> =
  | Func2Async<T, Possible<ComplexError>, Possible<T>>
  | Func3Sync<void, Possible<ComplexError>, Possible<T>, CallbackFunction<T>>

export function isSingleStageFunction<T extends StageObject>(
  inp?: any,
): inp is SingleStageFunction<T> {
  return is_func2_async(inp) || is_func3(inp)
}

export type RunPipelineFunction<T extends StageObject> =
  | Func3Sync<void, Possible<ComplexError>, T, CallbackFunction<T>>
  | Func2Sync<void, T, CallbackFunction<T>>
  | Func2Async<T, Possible<ComplexError>, T>
  | Func0Sync<T | Promise<T> | Thanable<T>>
  | Func1Async<T, T>
  | Func1Sync<T | Promise<T> | Thanable<T>, T>
  | Func1Sync<void, CallbackFunction<T>>
  | Func1Sync<void, T>
  | Func0Async<T>

export function isRunPipelineFunction<T extends StageObject>(
  inp: any,
): inp is RunPipelineFunction<T> {
  return (
    is_func0(inp) ||
    is_func0_async(inp) ||
    is_func1(inp) ||
    is_func1_async(inp) ||
    is_func2(inp) ||
    is_func2_async(inp) ||
    is_func3(inp)
  )
}

export type Rescue<T> =
  // context is applied as this
  | Func1Async<T, Error>
  | Func1Sync<T | Promise<T> | Thanable<T>, Error>
  // not applied as this
  | Func2Async<T, Possible<ComplexError>, Possible<T>>
  | Func2Sync<T | Promise<T> | Thanable<T>, Error, Possible<T>>
  | Func3Sync<void, Error, Possible<T>, CallbackFunction<T>>

export function isRescue<T>(inp: any): inp is Rescue<T> {
  return (
    is_func1(inp) ||
    is_func1_async(inp) ||
    is_func2(inp) ||
    is_func2_async(inp) ||
    is_func3(inp)
  )
}

export type ValidateFunction<T> =
  // will throw error
  | (() => boolean)
  | ((value: T) => boolean)
  // will reject with error
  | ((value: T) => Promise<boolean>)
  | ((value: T) => Thanable<boolean>)
  // will return error in callback
  | ((value: T, callback: CallbackExternalFunction<boolean>) => void)

export function isValidateFunction<T>(inp: any): inp is ValidateFunction<T> {
  return is_func1(inp) || is_func1_async(inp) || is_func2(inp)
}

// validate and ensure
export type EnsureFunction<T> =
  // will throw error
  | Func1Sync<T | Promise<T> | Thanable<T>, T>
  // will refect with error
  | Func1Async<T, T>
  // will return error in callback
  | Func2Sync<void, T, CallbackFunction<T>>

export function isEnsureFunction<T>(inp: any): inp is EnsureFunction<T> {
  return is_func1(inp) || is_func1_async(inp) || is_func2(inp)
}
export interface StageConfig<T extends StageObject> {
  run?: RunPipelineFunction<T>
  name?: string
  rescue?: Rescue<T>
  schema?: JSONSchemaType<T>
  ensure?: EnsureFunction<T>
  validate?: ValidateFunction<T>
  compile?<C extends StageConfig<T>>(
    this: Stage<T, C>,
    rebuild: boolean,
  ): StageRun<T>
  precompile?<C extends StageConfig<T>>(this: C): void
}

export interface PipelineConfig<T extends StageObject> extends StageConfig<T> {
  stages: Array<AnyStage<T> | RunPipelineFunction<T>>
}

export interface ParallelConfig<T extends StageObject> extends StageConfig<T> {
  stage: AnyStage<T> | RunPipelineFunction<T>
  split?: Func1Sync<Array<T>, Possible<T>>
  combine?: Func2Sync<Possible<T> | void, Possible<T>, Array<any>>
}

export function isStageRun<T extends StageObject>(
  inp: Function,
): inp is StageRun<T> {
  return inp?.length == 3
}

export type StageRun<T extends StageObject> = (
  err: Possible<ComplexError>,
  context: T,
  callback: CallbackFunction<T>,
) => void

export type AllowedStage<T extends StageObject, C extends StageConfig<T>> =
  | string
  | C
  | RunPipelineFunction<T>
  | AnyStage<T>

export function isAllowedStage<T extends StageObject, C extends StageConfig<T>>(
  inp: any,
): inp is AllowedStage<T, C> {
  return (
    isRunPipelineFunction(inp) ||
    inp instanceof Stage ||
    typeof inp == 'object' ||
    typeof inp == 'string'
  )
}

export function getStageConfig<T extends StageObject, C extends StageConfig<T>>(
  config: AllowedStage<T, C>,
): C | AnyStage<T> {
  let result: C = {} as C
  if (typeof config == 'string') {
    result.name = config
  } else if (config instanceof Stage) {
    return config
  } else if (isRunPipelineFunction<T>(config)) {
    result.run = config
    result.name = getNameFrom<T, C>(result)
  } else {
    if (config.name) {
      result.name = config.name
    }
    if (isRescue<T>(config.rescue)) {
      result.rescue = config.rescue
    }
    if (isRunPipelineFunction<T>(config.run)) {
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
    if (isValidateFunction<T>(config.validate)) {
      result.validate = config.validate
    }
    if (isEnsureFunction<T>(config.ensure)) {
      result.ensure = config.ensure
    }
    if (config.compile) {
      result.compile = config.compile
    }
    if (config.precompile) {
      result.precompile = config.precompile
    }
    if (config.schema) {
      result.schema = config.schema as JSONSchemaType<T>
      const ajv = new Ajv({ allErrors: true })
      ajvFormats(ajv)
      ajvErrors(ajv, { singleError: true })
      ajvKeywords(ajv)
      const validate = ajv.compile(result.schema)
      result.validate = ((ctx: T): boolean => {
        if (!validate(ctx) && validate.errors) {
          throw CreateError(ajv.errorsText(validate.errors))
        } else return true
      }) as ValidateFunction<T>
    }
    if (!config.name) {
      result.name = getNameFrom<T, C>(config)
    }
  }
  return result
}

export function getNameFrom<T extends StageObject, C extends StageConfig<T>>(
  config: C,
): string {
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

export type AllowedPipeline<T extends StageObject> =
  | AllowedStage<T, PipelineConfig<T>>
  | Array<RunPipelineFunction<T> | AnyStage<T>>

export function getPipelinConfig<T extends StageObject>(
  config: AllowedPipeline<T>,
): PipelineConfig<T> {
  if (Array.isArray(config)) {
    return {
      stages: config.map((item): AnyStage<T> | RunPipelineFunction<T> => {
        if (isRunPipelineFunction(item)) {
          return item as RunPipelineFunction<T>
        } else if (item instanceof Stage) {
          return item as AnyStage<T>
        } else {
          throw CreateError('not suitable type for array in pipeline')
        }
      }),
    }
  } else {
    const res: PipelineConfig<T> | AnyStage<T> = getStageConfig<
      T,
      PipelineConfig<T>
    >(config)
    if (res instanceof Stage) {
      return { stages: [res] } as PipelineConfig<T>
    } else if (typeof config == 'object' && !(config instanceof Stage)) {
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
    return res
  }
}

export function getParallelConfig<T extends StageObject>(
  config: AllowedStage<T, ParallelConfig<T>>,
): ParallelConfig<T> {
  const res = getStageConfig<T, ParallelConfig<T>>(config)
  if (res instanceof Stage) {
    return { stage: res } as ParallelConfig<T>
  } else if (typeof config == 'object' && !(config instanceof Stage)) {
    if (config.run && config.stage) {
      throw CreateError("don't use run and stage both")
    }
    if (config.split) {
      res.split = config.split
    }
    if (config.combine) {
      res.combine = config.combine
    }
    if (config.stage) {
      res.stage = config.stage
    }
    if (config.run) {
      res.stage = config.run
    }
  } else if (typeof config == 'function' && res.run) {
    res.stage = res.run
    delete res.run
  }
  return res
}

export function getEmptyConfig<T extends StageObject>(
  config: AllowedStage<T, StageConfig<T>>,
): AnyStage<T> | StageConfig<T> {
  const res = getStageConfig(config)

  if (res instanceof Stage) {
    return res
  } else {
    res.run = empty_run as RunPipelineFunction<T>
  }

  return res
}

export interface WrapConfig<T extends StageObject> extends StageConfig<T> {
  stage: AnyStage<T> | RunPipelineFunction<T>
  prepare: (ctx: Possible<T>) => Possible<T>
  finalize: (ctx: Possible<T>, retCtx: Possible<T>) => Possible<T>
}

export function getWrapConfig<T extends StageObject, C extends WrapConfig<T>>(
  config: AllowedStage<T, C>,
): C {
  const res = getStageConfig<T, C>(config)
  if (res instanceof Stage) {
    return { stage: res } as C
  } else if (typeof config == 'object' && !(config instanceof Stage)) {
    if (config.run && config.stage) {
      throw CreateError("don't use run and stage both")
    }
    if (config.run) {
      res.stage = config.run as RunPipelineFunction<any>
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

export interface TimeoutConfig<T extends StageObject> extends StageConfig<T> {
  timeout?: number | Func1Sync<number, Possible<T>>
  stage?: AnyStage<T> | RunPipelineFunction<T>
  overdue?: AnyStage<T> | RunPipelineFunction<T>
}

export function getTimeoutConfig<T extends StageObject>(
  config: AllowedStage<T, TimeoutConfig<T>>,
): TimeoutConfig<T> {
  const res = getStageConfig<T, TimeoutConfig<T>>(config)
  if (res instanceof Stage) {
    return { stage: res } as TimeoutConfig<T>
  } else if (typeof config == 'object' && !(config instanceof Stage)) {
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

export interface IfElseConfig<T extends StageObject> extends StageConfig<T> {
  condition?: boolean | ValidateFunction<T>
  success?: AnyStage<T> | RunPipelineFunction<T>
  failed?: AnyStage<T> | RunPipelineFunction<T>
}

export function getIfElseConfig<
  T extends StageObject,
  C extends IfElseConfig<T>,
>(config: AllowedStage<T, C>): C {
  const res = getStageConfig<T, C>(config)
  if (res instanceof Stage) {
    return { success: res } as C
  } else if (typeof config == 'object' && !(config instanceof Stage)) {
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
      res.failed = empty_run as RunPipelineFunction<T>
    }
  } else if (typeof config == 'function' && res.run) {
    res.success = res.run
    res.failed = empty_run as RunPipelineFunction<T>
    res.condition = true
    delete res.run
  } else {
    res.success = empty_run as RunPipelineFunction<T>
  }
  return res
}

export type AnyStage<T extends StageObject> =
  | Stage<T, StageConfig<T>>
  | DoWhile<T>
  | Empty<T>
  | IfElse<T>
  | MultiWaySwitch<T>
  | Parallel<T>
  | Pipeline<T>
  | RetryOnError<T>
  | Sequential<T>
  | Timeout<T>
  | Wrap<T>
