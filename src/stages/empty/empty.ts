import { AllowedStage, isAnyStage, Stage, StageConfig } from '../../stage'
import { getEmptyConfig } from './getEmptyConfig'

export class Empty<Input, Output, Config extends StageConfig<Input, Output> = StageConfig<Input, Output>>
  extends Stage<Input, Output, Config> {
  constructor(config: AllowedStage<Input, Output, Config>) {
    super()
    const res = getEmptyConfig(config)
    if (isAnyStage(res)) {
      return res as Empty<Input, Output, Config>
    } else {
      this._config = res
    }
  }

  public override toString() {
    return '[pipeline Empty]'
  }
}
