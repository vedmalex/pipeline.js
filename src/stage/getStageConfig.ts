import { StageConfig } from './StageConfig'
import { AllowedStage, AnyStage, getNameFrom, isRescue, isRunPipelineFunction } from './types'

export const StageSymbol = Symbol('stage')

export function isAnyStage<Input, Output>(obj: unknown): obj is AnyStage<Input, Output> {
  return typeof obj === 'object' && obj !== null && StageSymbol in obj
}

export function isAllowedStage<Input, Output, Config>(inp: any): inp is AllowedStage<Input, Output, Config> {
  return isRunPipelineFunction(inp) || isAnyStage(inp) || typeof inp == 'object' || typeof inp == 'string'
}

export function getStageConfig<Input, Output, Config extends StageConfig<Input, Output>>(
  config: AllowedStage<Input, Output, Config>,
): Config | AnyStage<Input, Output> {
  let result: Config = {} as Config
  if (typeof config == 'string') {
    result.name = config
  } else if (isAnyStage<Input, Output>(config)) {
    return config
  } else if (isRunPipelineFunction<Input, Output>(config)) {
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
      result.name = getNameFrom<Input, Output, Config>(config)
    }
  }
  return result
}
