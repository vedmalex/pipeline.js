import { JSONSchemaType } from 'ajv'
import { Stage } from '../stage'
import { CreateError } from './ErrorList'

import Ajv from 'ajv'

import ajvFormats from 'ajv-formats'
import ajvKeywords from 'ajv-keywords'
import ajvErrors from 'ajv-errors'
import { empty_run } from './empty_run'

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

export function is_func0_async<R>(inp: Function): inp is Func0Async<R> {
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
  return typeof inp == 'object' && inp.hasOwnProperty('then')
}

export type CallbackFunction<T> = (err?: Error, res?: T) => void

export type SingleStageFunction<T> =
  | Func2Async<T, Error, T>
  | Func3Sync<void, Error, T, CallbackFunction<T>>

export function isSingleStageFunction<T>(
  inp?: any,
): inp is SingleStageFunction<T> {
  return is_func2_async(inp) || is_func3(inp)
}

export type RunPipelineFunction<T = any, R = T> =
  | Func0Async<R | T>
  | Func0Sync<R | T | Promise<R | T> | Thanable<R | T>>
  | Func1Async<R | T, T>
  | Func1Sync<R | T | Promise<R | T> | Thanable<R | T>, T>
  | Func2Async<R | T, Error, T>
  | Func2Sync<void, T, CallbackFunction<R | T>>
  | Func3Sync<void, Error, T, CallbackFunction<T | R>>

export function isRunPipelineFunction<T, R>(
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

export type Rescue<T, R> =
  // context is applied as this
  | Func1Async<R | T, Error>
  | Func1Sync<R | Promise<R> | Thanable<R>, Error>
  // not applied as this
  | Func2Async<R | T, Error | undefined, T>
  | Func2Sync<R | Promise<R> | Thanable<R>, Error, T>
  | Func3Sync<void, Error, T, CallbackFunction<R | T>>

export function isRescue<T, R>(inp: any): inp is Rescue<T, R> {
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
export interface StageConfig<T = any, R = T> {
  run?: RunPipelineFunction<T, R>
  name?: string
  rescue?: Rescue<T, R>
  schema?: JSONSchemaType<T>
  ensure?: EnsureFunction<T>
  validate?: ValidateFunction<T>
  compile?<C extends StageConfig<T, R>>(
    this: Stage<T, C, R>,
    rebuild: boolean,
  ): StageRun<T, R>
  precompile?<C extends StageConfig<T, R>>(this: C): void
}

export interface PipelineConfig<T, R> extends StageConfig<T, R> {
  stages: Array<Stage | RunPipelineFunction>
}

export interface ParallelConfig<T, R> extends StageConfig<T, R> {
  stage: Stage<T, any, R> | RunPipelineFunction<T, R>
  split?: Func1Sync<Array<any>, T | R>
  combine?: Func2Sync<T | R | void, T | R, Array<any>>
}

export type StageRun<T, R> = (
  err: Error | undefined,
  context: T,
  callback: CallbackFunction<T | R>,
) => void

export type AllowedStage<T = any, C extends StageConfig<T, R> = any, R = T> =
  | string
  | C
  | RunPipelineFunction<T, R>
  | Stage<T, C, R>

export function isAllowedStage<
  T = any,
  C extends StageConfig<T, R> = any,
  R = T,
>(inp: any): inp is AllowedStage<T, C, R> {
  return (
    isRunPipelineFunction(inp) ||
    inp instanceof Stage ||
    typeof inp == 'object' ||
    typeof inp == 'string'
  )
}

export function getStageConfig<T, C extends StageConfig<T, R>, R>(
  config: AllowedStage<T, C, R>,
): C | Stage {
  let result: C = {} as C
  if (typeof config == 'string') {
    result.name = config
  } else if (config instanceof Stage) {
    return config
  } else if (isRunPipelineFunction<T, R>(config)) {
    result.run = config
    result.name = getNameFrom(result)
  } else {
    if (config.name) {
      result.name = config.name
    }
    if (isRescue<T, R>(config.rescue)) {
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
      result.schema = config.schema
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
      result.name = getNameFrom(config)
    }
  }
  return result
}

export function getNameFrom<C extends StageConfig>(config: C): string {
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

export type AllowedPipeline<T, C extends PipelineConfig<T, R>, R> =
  | AllowedStage<T, C, R>
  | Array<RunPipelineFunction<T, R> | Stage<T, C, R>>

export function getPipelinConfig<T, C extends PipelineConfig<T, R>, R>(
  config: AllowedPipeline<T, C, R>,
): C {
  if (Array.isArray(config)) {
    return {
      stages: config.map(item => {
        if (isRunPipelineFunction(item)) {
          return item
        } else if (item instanceof Stage) {
          return item
        } else {
          throw CreateError('not suitable type for array in pipelin')
        }
      }),
    } as C
  } else {
    const res = getStageConfig(config)
    if (res instanceof Stage) {
      return { stages: [res] } as C
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

export function getParallelConfig<T, C extends ParallelConfig<T, R>, R>(
  config: AllowedStage<T, C, R>,
): C {
  const res = getStageConfig(config)
  if (res instanceof Stage) {
    return { stage: res } as C
  } else if (typeof config == 'object' && !(config instanceof Stage)) {
    if (config.run && config.stage) {
      throw CreateError("don't use run and stage both")
    }
    res.split = config.split
    res.combine = config.combine
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

export function getEmptyConfig<T, C extends StageConfig<T, R>, R>(
  config: AllowedStage<T, StageConfig<T, R>, R>,
): Stage<T, C, R> | StageConfig<T, R> {
  const res = getStageConfig(config)

  if (res instanceof Stage) {
    return res as Stage<T, C, R>
  } else {
    res.run = empty_run
  }

  return res
}

export interface WrapConfig<T, R> extends StageConfig<T, R> {
  stage: Stage<T, any, R> | RunPipelineFunction<T, R>
  prepare: Function
  finalize: Function
}

export function getWrapConfig<T, C extends WrapConfig<T, R>, R>(
  config: AllowedStage<T, C, R>,
): C {
  const res = getStageConfig(config)
  if (res instanceof Stage) {
    return { stage: res } as C
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
    res.finalize = config.finalize
    res.prepare = config.prepare
  }
  return res
}

export interface TimeoutConfig<T, R> extends StageConfig<T, R> {
  timeout?: number | Func1Sync<number, T | R>
  stage?: Stage<T, any, R> | RunPipelineFunction<T, R>
  overdue?: Stage<T, any, R> | RunPipelineFunction<T, R>
}

export function getTimeoutConfig<T, C extends TimeoutConfig<T, R>, R>(
  config: AllowedStage<T, C, R>,
): C {
  const res = getStageConfig(config)
  if (res instanceof Stage) {
    return { stage: res } as C
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

export interface IfElseConfig<T, R> extends StageConfig<T, R> {
  condition?: boolean | ValidateFunction<T | R>
  success?: Stage<T, any, R> | RunPipelineFunction<T, R>
  failed?: Stage<T, any, R> | RunPipelineFunction<T, R>
}

export function getIfElseConfig<T, C extends IfElseConfig<T, R>, R>(
  config: AllowedStage<T, C, R>,
): C {
  const res = getStageConfig(config)
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
