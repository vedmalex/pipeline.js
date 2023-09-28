import { AllowedStage, CreateError, getStageConfig, isAnyStage, RunPipelineFunction } from '../../stage'
import { WrapConfig } from './WrapConfig'

export function getWrapConfig<Input, Output, T, Config extends WrapConfig<Input, Output, T>>(
  config: AllowedStage<Input, Output, Config>,
): Config {
  const res = getStageConfig(config)
  if (isAnyStage<Input, Output>(res)) {
    return { stage: res } as Config
  } else if (typeof config == 'object' && !isAnyStage<Input, Output>(config)) {
    if (config.run && config.stage) {
      throw CreateError("don't use run and stage both")
    }
    if (config.run) {
      res.stage = config.run as RunPipelineFunction<Input, Output>
    }
    if (config.stage) {
      res.stage = config.stage
    }
    if (config.finalize) {
      res.finalize = config.finalize
    }
    if (config.prepare) {
      res.prepare = config.prepare
    }
    res.prepare = config.prepare
  }
  return res
}
