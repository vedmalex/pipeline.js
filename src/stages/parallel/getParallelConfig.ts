import { AllowedStage, getStageConfig, isAnyStage, isRunPipelineFunction } from '../../stage'
import { ParallelConfig } from './ParallelConfig'

export function getParallelConfig<Input, Output, T, Config extends ParallelConfig<Input, Output, T>>(
  config: AllowedStage<Input, Output, Config>,
): Config {
  const res = getStageConfig<Input, Output, ParallelConfig<Input, Output, T>>(config)
  if (isAnyStage(res) || isRunPipelineFunction(res)) {
    return { stage: res } as Config
  } else if (typeof config == 'object' && !isAnyStage(config)) {
    const r = res
    if (config.split) {
      r.split = config.split
    }
    if (config.combine) {
      r.combine = config.combine
    }
    if (config.stage) {
      r.stage = config.stage
    }
  }
  return res as Config
}
