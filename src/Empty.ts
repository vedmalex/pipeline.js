import { Stage } from './stage'
import { getEmptyConfig, StageConfig, AllowedStage } from './utils/types'
export class Empty<
  T = any,
  C extends StageConfig<T, R> = any,
  R = T,
> extends Stage<T, C, R> {
  constructor(config: AllowedStage<T, C, R>) {
    super()
    const res = getEmptyConfig(config)
    if (res instanceof Stage) {
      return res as Stage<T, C, R>
    } else {
      this._config = res as C
    }
  }

  public override toString() {
    return '[pipeline Empty]'
  }
}
