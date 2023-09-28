import { isAnyStage } from '../getStageConfig'
import { StageConfig } from '../StageConfig'
import { AllowedStage } from './AllowedStage'

export function getNameFrom<Input, Output, Config extends StageConfig<Input, Output>>(
  config: AllowedStage<Input, Output, Config>,
): string {
  if (typeof config === 'string') {
    return config
  }
  let result: string = ''
  if (typeof config === 'string') {
    result = config
  } else if (isAnyStage(config)) {
    result = config.name
  } else if (typeof config === 'object') {
    var match = config.run?.toString().match(/function\s*(\w+)\s*\(/)
    if (match && match[1]) {
      result = match[1]
    } else {
      result = config.run?.toString() ?? ''
    }
  } else {
    result = config.name ?? ''
  }
  return result
}
