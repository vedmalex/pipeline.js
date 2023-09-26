import { AllowedStage, AnyStage, empty_run, getStageConfig, isAnyStage, StageConfig, StageObject } from '../../stage'

export function getEmptyConfig<R extends StageObject, C extends StageConfig<R>>(
  config: AllowedStage<R, C>,
): AnyStage<R> | C {
  const res = getStageConfig(config)

  if (isAnyStage(res)) {
    return res
  } else {
    res.run = empty_run
  }

  return res
}
