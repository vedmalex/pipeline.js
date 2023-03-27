import { Stage } from './stage'
import { isAnyStage } from './utils/types/types'
import { AllowedStage, getEmptyConfig, StageConfig } from './utils/types/types'
export class Empty<R, C extends StageConfig<R> = StageConfig<R>> extends Stage<R, C> {
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
