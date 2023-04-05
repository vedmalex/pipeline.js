import Ajv from 'ajv'
import ajvErrors from 'ajv-errors'
import ajvFormats from 'ajv-formats'
import ajvKeywords from 'ajv-keywords'
import { StageConfig } from './StageConfig'
import {
  AllowedStage,
  AnyStage,
  getNameFrom,
  isEnsureFunction,
  isRescue,
  isRunPipelineFunction,
  isValidateFunction,
} from './types'
import { CreateError } from './errors'

export const StageSymbol = Symbol('stage')

export function isStage(obj: unknown): boolean {
  return typeof obj === 'object' && obj !== null && StageSymbol in obj
}

export function isAnyStage<R>(obj: unknown): obj is AnyStage<R> {
  return isStage(obj)
}

export function isAllowedStage<R, C extends StageConfig<R>>(inp: any): inp is AllowedStage<R, C> {
  return isRunPipelineFunction(inp) || isAnyStage(inp) || typeof inp == 'object' || typeof inp == 'string'
}

export function getStageConfig<R, C extends StageConfig<R>>(config: AllowedStage<R, C>): C | AnyStage<R> {
  let result: C = {} as C
  if (typeof config == 'string') {
    result.name = config
  } else if (isAnyStage<R>(config)) {
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
