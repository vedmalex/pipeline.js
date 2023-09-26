import { AllowedStage, CreateError, getStageConfig, isAnyStage } from '../../stage'
import { RetryOnErrorConfig } from './RetryOnErrorConfig'

export function getRetryOnErrorConfig<R, T, C extends RetryOnErrorConfig<R, T>>(
  config: AllowedStage<R, C>,
): C {
  const res = getStageConfig(config)
  if (isAnyStage(res)) {
    return { stage: res } as C
  } else if (typeof config == 'object' && !isAnyStage(config)) {
    if (config.run && config.stage) {
      throw CreateError("don't use run and stage both")
    }
    if (config.run) {
      res.stage = config.run
    }
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
  } else if (typeof config == 'function' && res.run) {
    res.stage = res.run
    delete res.run
  }
  return res
}
