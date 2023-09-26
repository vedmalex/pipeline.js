import { fromZodError } from 'zod-validation-error'
import { CreateError } from './errors'
import { StageConfig } from './StageConfig'
import {
  AllowedStage,
  AnyStage,
  getNameFrom,
  isEnsureFunction,
  isRescue,
  isRunPipelineFunction,
  isValidateFunction,
  StageObject,
} from './types'

export const StageSymbol = Symbol('stage')

export function isAnyStage<R extends StageObject>(obj: unknown): obj is AnyStage<R> {
  return typeof obj === 'object' && obj !== null && StageSymbol in obj
}

export function isAllowedStage<R extends StageObject, C extends StageConfig<R>>(inp: any): inp is AllowedStage<R, C> {
  return isRunPipelineFunction(inp) || isAnyStage(inp) || typeof inp == 'object' || typeof inp == 'string'
}

export function getStageConfig<R extends StageObject, C extends StageConfig<R>>(
  config: AllowedStage<R, C>,
): C | AnyStage<R> {
  let result: C = {} as C
  if (typeof config == 'string') {
    result.name = config
  } else if (isAnyStage<R>(config)) {
    return config
  } else if (isRunPipelineFunction<R>(config)) {
    result.run = config
    result.name = getNameFrom(result)
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
      result.validate = (ctx: unknown): boolean => {
        const pr = result.schema?.safeParse(ctx)
        if (!pr?.success) {
          throw CreateError(fromZodError(pr?.error!))
        } else {
          return true
        }
      }
    }
    if (!config.name) {
      result.name = getNameFrom(config)
    }
  }
  return result
}
