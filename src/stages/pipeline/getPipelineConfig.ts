import {
  AnyStage,
  CreateError,
  RunPipelineFunction,
  getStageConfig,
  isAnyStage,
  isRunPipelineFunction,
} from '../../stage'
import { AllowedPipeline } from './AllowedPipeline'
import { PipelineConfig } from './PipelineConfig'

export function getPipelineConfig<R, C extends PipelineConfig<R>>(config: AllowedPipeline<R>): C {
  if (Array.isArray(config)) {
    return {
      stages: config.map((item): AnyStage<R> | RunPipelineFunction<R> => {
        if (isRunPipelineFunction(item)) {
          return item as RunPipelineFunction<R>
        } else if (isAnyStage(item)) {
          return item
        } else {
          throw CreateError('not suitable type for array in pipeline')
        }
      }),
    } as C
  } else {
    const res: PipelineConfig<R> | AnyStage<R> = getStageConfig<R, PipelineConfig<R>>(config)
    if (isAnyStage(res)) {
      return { stages: [res] } as C
    } else if (typeof config == 'object' && !isAnyStage(config)) {
      if (config.run && config.stages?.length > 0) {
        throw CreateError(" don't use run and stage both ")
      }
      if (config.run) {
        res.stages = [config.run]
      }
      if (config.stages) {
        res.stages = config.stages
      }
    } else if (typeof config == 'function' && res.run) {
      res.stages = [res.run]
      delete res.run
    }
    if (!res.stages) res.stages = []
    return res as C
  }
}
