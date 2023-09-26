import {
  AllowedStage,
  CreateError,
  empty_run,
  getStageConfig,
  isAnyStage,
  RunPipelineFunction,
  StageObject,
} from '../../stage'
import { IfElseConfig } from './IfElseConfig'

export function getIfElseConfig<R extends StageObject, C extends IfElseConfig<R>>(config: AllowedStage<R, C>): C {
  const res = getStageConfig<R, C>(config)
  if (isAnyStage(res)) {
    return { success: res } as C
  } else if (typeof config == 'object' && !isAnyStage(config)) {
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
      res.failed = empty_run as RunPipelineFunction<R>
    }
  } else if (typeof config == 'function' && res.run) {
    res.success = res.run
    res.failed = empty_run as RunPipelineFunction<R>
    res.condition = true
    delete res.run
  } else {
    res.success = empty_run as RunPipelineFunction<R>
  }
  return res
}
