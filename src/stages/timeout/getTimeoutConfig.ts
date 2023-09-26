import { AllowedStage, CreateError, getStageConfig, isAnyStage, StageObject } from '../../stage'
import { TimeoutConfig } from './TimeoutConfig'

export function getTimeoutConfig<R extends StageObject, C extends TimeoutConfig<R>>(config: AllowedStage<R, C>): C {
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
    res.timeout = config.timeout
    res.overdue = config.overdue
  } else if (typeof config == 'function' && res.run) {
    res.stage = res.run
    delete res.run
  }
  return res
}
