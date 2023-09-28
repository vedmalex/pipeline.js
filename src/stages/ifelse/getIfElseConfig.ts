import { AllowedStage, CreateError, empty_run, getStageConfig, isAnyStage, RunPipelineFunction } from '../../stage'
import { IfElseConfig } from './IfElseConfig'

export function getIfElseConfig<Input, Output, Config extends IfElseConfig<Input, Output>>(
  config: AllowedStage<Input, Output, Config>,
): Config {
  const res = getStageConfig<Input, Output, Config>(config)
  if (isAnyStage(res)) {
    return { success: res } as Config
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
      res.failed = empty_run as RunPipelineFunction<Input, Output>
    }
  } else if (typeof config == 'function' && res.run) {
    res.success = res.run
    res.failed = empty_run as RunPipelineFunction<Input, Output>
    res.condition = true
    delete res.run
  } else {
    res.success = empty_run as RunPipelineFunction<Input, Output>
  }
  return res
}
