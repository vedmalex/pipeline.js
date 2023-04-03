import { CreateError } from 'src/stage/errors/CreateError'
import { RunPipelineFunction } from '../../stage/types/RunPipelineFunction'
import { getStageConfig } from '../../stage/getStageConfig'
import { WrapConfig } from './WrapConfig'
import { AllowedStage } from '../../stage/types/AllowedStage'
import { isAnyStage } from '../../stage/types/isAnyStage'

export function getWrapConfig<R, T, C extends WrapConfig<R, T>>(config: AllowedStage<R, C>): C {
  const res = getStageConfig(config)
  if (isAnyStage(res)) {
    return { stage: res } as C
  } else if (typeof config == 'object' && !isAnyStage(config)) {
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
