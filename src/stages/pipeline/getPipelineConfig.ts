import {
  AnyStage,
  CreateError,
  getStageConfig,
  isAnyStage,
  isRunPipelineFunction,
  RunPipelineFunction,
} from '../../stage'
import { AllowedPipeline } from './AllowedPipeline'
import { PipelineConfig } from './PipelineConfig'

export function getPipelineConfig<Input, Output, Config extends PipelineConfig<Input, Output>>(
  config: AllowedPipeline<Input, Output>,
): Config {
  if (Array.isArray(config)) {
    return {
      stages: config.map((item): AnyStage<Input, Output> | RunPipelineFunction<Input, Output> => {
        if (isRunPipelineFunction(item)) {
          return item as RunPipelineFunction<Input, Output>
        } else if (isAnyStage(item)) {
          return item
        } else {
          throw CreateError('not suitable type for array in pipeline')
        }
      }),
    } as Config
  } else {
    const res: PipelineConfig<Input, Output> | AnyStage<Input, Output> = getStageConfig<
      Input,
      Output,
      PipelineConfig<Input, Output>
    >(config)
    if (isAnyStage(res)) {
      return { stages: [res] } as Config
    } else if (typeof config == 'object' && !isAnyStage(config)) {
      if (config.stages) {
        res.stages = config.stages
      }
    }
    if (!res.stages) {
      res.stages = []
    }
    return res as Config
  }
}
