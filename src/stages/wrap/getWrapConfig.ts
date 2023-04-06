import { AllowedStage, CreateError, RunPipelineFunction, StageObject, getStageConfig, isAnyStage } from '../../stage'
import { WrapConfig } from './WrapConfig'

export function getWrapConfig<R extends StageObject, T extends StageObject, C extends WrapConfig<R, T>>(
  config: AllowedStage<R, C>,
): C {
  const res = getStageConfig(config)
  if (isAnyStage<R>(res)) {
    return { stage: res } as C
  } else if (typeof config == 'object' && !isAnyStage<R>(config)) {
    if (config.run && config.stage) {
      throw CreateError("don't use run and stage both")
    }
    if (config.run) {
      res.stage = config.run as RunPipelineFunction<R>
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
