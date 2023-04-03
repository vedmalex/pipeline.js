import {
  AllowedStage,
  CreateError,
  RunPipelineFunction,
  getStageConfig,
  isAnyStage,
  isRunPipelineFunction,
} from '../../stage'
import { ParallelConfig } from './ParallelConfig'

export function getParallelConfig<R, T, C extends ParallelConfig<R, T>>(config: AllowedStage<R, C>): C {
  const res = getStageConfig<R, ParallelConfig<R, T>>(config)
  if (isAnyStage(res) || isRunPipelineFunction(res)) {
    return { stage: res } as C
  } else if (typeof config == 'object' && !isAnyStage(config)) {
    const r = res
    if (config.run && config.stage) {
      throw CreateError("don't use run and stage both")
    }
    if (config.split) {
      r.split = config.split
    }
    if (config.combine) {
      r.combine = config.combine
    }
    if (config.stage) {
      r.stage = config.stage
    }
    if (config.run) {
      r.stage = config.run
    }
  } else if (typeof config == 'function' && res.run) {
    res.stage = res.run as RunPipelineFunction<R>
    delete res.run
  }
  return res as C
}
