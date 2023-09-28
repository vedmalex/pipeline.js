import { AllowedStage, AnyStage, empty_run, getStageConfig, isAnyStage, StageConfig } from '../../stage'

export function getEmptyConfig<Input, Output, Config extends StageConfig<Input, Output>>(
  config: AllowedStage<Input, Output, Config>,
): AnyStage<Input, Output> | Config {
  const res = getStageConfig(config)

  if (isAnyStage(res)) {
    return res
  } else {
    res.run = empty_run
  }

  return res
}
