import { JSONSchemaType } from 'ajv'
import { Stage } from '../stage'
import { CreateError } from './ErrorList'

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

export type StageObject = Record<string | symbol, any>

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
  return inp?.constructor?.name == 'AsyncFunction'
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
// export type CallbackFunction<T> = (err: Error|undefined, res: T) => void
export type CallbackFunction<T> = (
  err?: Possible<Error>,
  res?: Possible<T>,
) => void

export type SingleStageFunction<T extends StageObject, R> =
  | Func2Async<R, Possible<Error>, Possible<T>>
  | Func3Sync<void, Possible<Error>, Possible<T>, CallbackFunction<R>>

export function isSingleStageFunction<T extends StageObject, R>(
  inp?: any,
): inp is SingleStageFunction<T, R> {
  return is_func2_async(inp) || is_func3(inp)
}

export type RunPipelineFunction<T extends StageObject, R> =
  | Func0Async<R>
  | Func0Sync<R | Promise<R> | Thanable<R>>
  | Func1Async<R, Possible<T>>
  | Func1Sync<R | Promise<R> | Thanable<R>, Possible<T>>
  | Func2Async<R, Possible<Error>, Possible<T>>
  | Func2Sync<void, Possible<T>, CallbackFunction<R>>
  | Func3Sync<void, Possible<Error>, Possible<T>, CallbackFunction<R>>

export function isRunPipelineFunction<T extends StageObject, R>(
  inp: any,
): inp is RunPipelineFunction<T, R> {
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
  | Func2Async<T, Possible<Error>, Possible<T>>
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

// validate and ensure
export type ValidateFunction<T> =
  // will throw error
  | Func1Sync<boolean | Promise<boolean> | Thanable<boolean>, T>
  // will reject with error
  | Func1Async<boolean, T>
  // will return error in callback
  | Func2Sync<void, T, CallbackFunction<boolean>>

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
export interface StageConfig<T extends StageObject, R extends StageObject> {
  run?: RunPipelineFunction<T, R>
  name?: string
  rescue?: Rescue<T>
  schema?: JSONSchemaType<T>
  ensure?: EnsureFunction<T>
  validate?: ValidateFunction<T>
  compile?<C extends StageConfig<T, R>>(
    this: Stage<T, C, R>,
    rebuild: boolean,
  ): StageRun<T, R>
  precompile?<C extends StageConfig<T, R>>(this: C): void
}

export interface PipelineConfig<T extends StageObject, R extends StageObject>
  extends StageConfig<T, R> {
  stages: Array<AnyStage<object, object> | RunPipelineFunction<object, object>>
}

export interface ParallelConfig<T extends StageObject, R extends StageObject>
  extends StageConfig<T, R> {
  stage: AnyStage<T, R> | RunPipelineFunction<T, R>
  split?: Func1Sync<Array<R>, Possible<T>>
  combine?: Func2Sync<Possible<R> | void, Possible<T>, Array<any>>
}

export function isStageRun<T extends StageObject, R>(
  inp: Function,
): inp is StageRun<T, R> {
  return inp?.length == 3
}

export type StageRun<T extends StageObject, R> = (
  err: Possible<Error>,
  context: Possible<T>,
  callback: CallbackFunction<R>,
) => void

export type AllowedStage<
  T extends StageObject,
  C extends StageConfig<T, R>,
  R extends StageObject,
> = string | C | RunPipelineFunction<T, R> | AnyStage<T, R>

export function isAllowedStage<
  T extends StageObject,
  C extends StageConfig<T, R>,
  R extends StageObject,
>(inp: any): inp is AllowedStage<T, C, R> {
  return (
    isRunPipelineFunction(inp) ||
    inp instanceof Stage ||
    typeof inp == 'object' ||
    typeof inp == 'string'
  )
}

export function getStageConfig<
  T extends StageObject,
  C extends StageConfig<T, R>,
  R extends StageObject,
>(config: AllowedStage<T, C, R>): C | AnyStage<T, R> {
  let result: C = {} as C
  if (typeof config == 'string') {
    result.name = config
  } else if (config instanceof Stage) {
    return config
  } else if (isRunPipelineFunction<T, R>(config)) {
    result.run = config
    result.name = getNameFrom<T, C, R>(result)
  } else {
    if (config.name) {
      result.name = config.name
    }
    if (isRescue<T>(config.rescue)) {
      result.rescue = config.rescue
    }
    if (isRunPipelineFunction<T, R>(config.run)) {
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
      result.validate = (ctx: T): boolean => {
        if (!validate(ctx) && validate.errors) {
          throw CreateError(ajv.errorsText(validate.errors))
        } else return true
      }
    }
    if (!config.name) {
      result.name = getNameFrom<T, C, R>(config)
    }
  }
  return result
}

export function getNameFrom<
  T extends StageObject,
  C extends StageConfig<T, R>,
  R extends StageObject,
>(config: C): string {
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

export type AllowedPipeline<T extends StageObject, R extends StageObject> =
  | AllowedStage<T, PipelineConfig<T, R>, R>
  | Array<RunPipelineFunction<T, R> | AnyStage<T, R>>

export function getPipelinConfig<T extends StageObject, R extends StageObject>(
  config: AllowedPipeline<T, R>,
): PipelineConfig<T, R> {
  if (Array.isArray(config)) {
    return {
      stages: config.map(
        (
          item,
        ): AnyStage<object, object> | RunPipelineFunction<object, object> => {
          if (isRunPipelineFunction(item)) {
            return item as RunPipelineFunction<object, object>
          } else if (item instanceof Stage) {
            return item as AnyStage<object, object>
          } else {
            throw CreateError('not suitable type for array in pipeline')
          }
        },
      ),
    }
  } else {
    const res: PipelineConfig<T, R> | AnyStage<T, R> = getStageConfig<
      T,
      PipelineConfig<T, R>,
      R
    >(config)
    if (res instanceof Stage) {
      return { stages: [res] } as PipelineConfig<T, R>
    } else if (typeof config == 'object' && !(config instanceof Stage)) {
      if (config.run && config.stages?.length > 0) {
        throw CreateError(" don't use run and stage both ")
      }
      if (config.run) {
        res.stages = [config.run as RunPipelineFunction<object, object>]
      }
      if (config.stages) {
        res.stages = config.stages
      }
    } else if (typeof config == 'function' && res.run) {
      res.stages = [res.run as RunPipelineFunction<object, object>]
      delete res.run
    }
    if (!res.stages) res.stages = []
    return res
  }
}

export function getParallelConfig<T extends StageObject, R extends StageObject>(
  config: AllowedStage<T, ParallelConfig<T, R>, R>,
): ParallelConfig<T, R> {
  const res = getStageConfig<T, ParallelConfig<T, R>, R>(config)
  if (res instanceof Stage) {
    return { stage: res } as ParallelConfig<T, R>
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

export function getEmptyConfig<T extends StageObject, R extends StageObject>(
  config: AllowedStage<T, StageConfig<T, R>, R>,
): AnyStage<T, R> | StageConfig<T, R> {
  const res = getStageConfig(config)

  if (res instanceof Stage) {
    return res as object as AnyStage<T, R>
  } else {
    res.run = empty_run
  }

  return res
}

export interface WrapConfig<T extends StageObject, R extends StageObject>
  extends StageConfig<T, R> {
  stage: AnyStage<object, object> | RunPipelineFunction<object, object>
  prepare: (ctx: Possible<T>) => object
  finalize: (ctx: Possible<T>, retCtx: object) => Possible<R>
}

export function getWrapConfig<
  T extends StageObject,
  C extends WrapConfig<T, R>,
  R extends StageObject,
>(config: AllowedStage<T, C, R>): C {
  const res = getStageConfig<T, C, R>(config)
  if (res instanceof Stage) {
    return { stage: res } as C
  } else if (typeof config == 'object' && !(config instanceof Stage)) {
    if (config.run && config.stage) {
      throw CreateError("don't use run and stage both")
    }
    if (config.run) {
      res.stage = config.run as RunPipelineFunction<any, any>
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

export interface TimeoutConfig<T extends StageObject, R extends StageObject>
  extends StageConfig<T, R> {
  timeout?: number | Func1Sync<number, Possible<T>>
  stage?: AnyStage<T, R> | RunPipelineFunction<T, R>
  overdue?: AnyStage<T, R> | RunPipelineFunction<T, R>
}

export function getTimeoutConfig<T extends StageObject, R extends StageObject>(
  config: AllowedStage<T, TimeoutConfig<T, R>, R>,
): TimeoutConfig<T, R> {
  const res = getStageConfig<T, TimeoutConfig<T, R>, R>(config)
  if (res instanceof Stage) {
    return { stage: res } as TimeoutConfig<T, R>
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

export interface IfElseConfig<T extends StageObject, R extends StageObject>
  extends StageConfig<T, R> {
  condition?: boolean | ValidateFunction<T>
  success?: AnyStage<T, R> | RunPipelineFunction<T, R>
  failed?: AnyStage<T, R> | RunPipelineFunction<T, R>
}

export function getIfElseConfig<
  T extends StageObject,
  C extends IfElseConfig<T, R>,
  R extends StageObject,
>(config: AllowedStage<T, C, R>): C {
  const res = getStageConfig<T, C, R>(config)
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
      res.failed = empty_run
    }
  } else if (typeof config == 'function' && res.run) {
    res.success = res.run
    res.failed = empty_run
    res.condition = true
    delete res.run
  } else {
    res.success = empty_run
  }
  return res
}

export type AnyStage<T extends StageObject, R extends StageObject> =
  | Stage<T, StageConfig<T, R>, R>
  | DoWhile<T, R>
  | Empty<T, R>
  | IfElse<T, R>
  | MultiWaySwitch<T, R>
  | Parallel<T, R>
  | Pipeline<T, R>
  | RetryOnError<T, R>
  | Sequential<T, R>
  | Timeout<T, R>
  | Wrap<T, R>
