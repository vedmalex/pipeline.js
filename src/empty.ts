import { Stage } from './stage'
import {
  AllowedStage,
  AnyStage,
  getEmptyConfig,
  StageConfig,
  StageObject,
} from './utils/types'
export class Empty<T extends StageObject> extends Stage<T, StageConfig<T>> {
  constructor(config: AllowedStage<T, StageConfig<T>>) {
    super()
    const res = getEmptyConfig(config)
    if (res instanceof Stage) {
      return res as unknown as AnyStage<T>
    } else {
      this._config = res as StageConfig<T>
    }
  }

  public override toString() {
    return '[pipeline Empty]'
  }
}
