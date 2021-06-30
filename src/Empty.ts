import { Stage } from './stage'
import { StageConfig } from './utils/types'
export class Empty<T, R> extends Stage<T, StageConfig<T, R>, R> {
  constructor(name?: string) {
    super(name)
    this._config.run = (err, context, callback) => callback(err, context)
  }

  public override toString() {
    return '[pipeline Empty]'
  }
}
