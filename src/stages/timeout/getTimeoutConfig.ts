import { AllowedStage, getStageConfig, isAnyStage } from '../../stage'
import { TimeoutConfig } from './TimeoutConfig'

export function getTimeoutConfig<Input, Output, Config extends TimeoutConfig<Input, Output>>(
  config: AllowedStage<Input, Output, Config>,
): Config {
  const res = getStageConfig(config)
  if (isAnyStage(res)) {
    return { stage: res } as Config
  } else if (typeof config == 'object' && !isAnyStage(config)) {
    if (config.stage) {
      res.stage = config.stage
    }
    res.timeout = config.timeout
    res.overdue = config.overdue
  }
  return res
}
