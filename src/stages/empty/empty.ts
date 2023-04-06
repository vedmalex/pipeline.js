import { AllowedStage, Stage, StageConfig, StageObject, isAnyStage } from '../../stage'
import { getEmptyConfig } from './getEmptyConfig'

export class Empty<R extends StageObject, C extends StageConfig<R> = StageConfig<R>> extends Stage<R, C> {
  constructor(config: AllowedStage<R, C>) {
    super()
    const res = getEmptyConfig(config)
    if (isAnyStage(res)) {
      return res as Empty<R, C>
    } else {
      this._config = res
    }
  }

  public override toString() {
    return '[pipeline Empty]'
  }
}
