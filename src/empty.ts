import { Stage } from './stage'
import { isAnyStage } from './utils/types'
import {
  AllowedStage,
  getEmptyConfig,
  StageConfig,
  StageObject,
} from './utils/types'
export class Empty<T extends StageObject> extends Stage<T, StageConfig<T>> {
  constructor(config: AllowedStage<T, T, StageConfig<T>>) {
    super()
    const res = getEmptyConfig(config)
    if (isAnyStage<T>(res)) {
      return res
    } else {
      this._config = res
    }
  }

  public override toString() {
    return '[pipeline Empty]'
  }
}
