import { AllowedStage, getStageConfig, isAnyStage } from '../../stage'
import { RetryOnErrorConfig } from './RetryOnErrorConfig'

export function getRetryOnErrorConfig<Input, Output, T, Config extends RetryOnErrorConfig<Input, Output, T>>(
  config: AllowedStage<Input, Output, Config>,
): Config {
  const res = getStageConfig(config)
  if (isAnyStage(res)) {
    return { stage: res } as Config
  } else if (typeof config == 'object' && !isAnyStage(config)) {
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
    if (!res.retry) {
      res.retry = 1
    }
  }
  return res
}
