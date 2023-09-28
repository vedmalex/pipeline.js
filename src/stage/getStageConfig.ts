import { StageConfig } from './StageConfig'
import { AllowedStage, AnyStage, getNameFrom, isRescue, isRunPipelineFunction } from './types'

export const StageSymbol = Symbol('stage')

export function isAnyStage<R>(obj: unknown): obj is AnyStage<R> {
  return typeof obj === 'object' && obj !== null && StageSymbol in obj
}

export function isAllowedStage<R, C>(inp: any): inp is AllowedStage<R, C> {
  return isRunPipelineFunction(inp) || isAnyStage(inp) || typeof inp == 'object' || typeof inp == 'string'
}

export function getStageConfig<R, C extends StageConfig<R>>(
  config: AllowedStage<R, C>,
): C | AnyStage<R> {
  let result: C = {} as C
  if (typeof config == 'string') {
    result.name = config
  } else if (isAnyStage<R>(config)) {
    return config
  } else if (isRunPipelineFunction<R>(config)) {
    result.run = config
    result.name = getNameFrom(config)
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
    if (config.compile) {
      result.compile = config.compile
    }
    if (config.input) {
      result.input = config.input
    }
    if (config.output) {
      result.output = config.output
    }
    if (!config.name) {
      result.name = getNameFrom<R, C>(config)
    }
  }
  return result
}
