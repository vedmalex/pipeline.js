import { Stage } from './stage'
import {
  AllowedStage,
  AnyStage,
  getEmptyConfig,
  StageConfig,
  StageObject,
} from './utils/types'
export class Empty<T extends StageObject, R = T> extends Stage<
  T,
  StageConfig<T, R>,
  R
> {
  constructor(config: AllowedStage<T, StageConfig<T, R>, R>) {
    super()
    const res = getEmptyConfig(config)
    if (res instanceof Stage) {
      return res as unknown as AnyStage<T, R>
    } else {
      this._config = res as StageConfig<T, R>
    }
  }

  public override toString() {
    return '[pipeline Empty]'
  }
}
