import {
  AllowedStage,
  CreateError,
  getStageConfig,
  isAnyStage,
  isRunPipelineFunction,
  RunPipelineFunction,
} from '../../stage'
import { ParallelConfig } from './ParallelConfig'

export function getParallelConfig<Input, Output, T, Config extends ParallelConfig<Input, Output, T>>(
  config: AllowedStage<Input, Output, Config>,
): Config {
  const res = getStageConfig<Input, Output, ParallelConfig<Input, Output, T>>(config)
  if (isAnyStage(res) || isRunPipelineFunction(res)) {
    return { stage: res } as Config
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
    res.stage = res.run as RunPipelineFunction<Input, Output>
    delete res.run
  }
  return res as Config
}
