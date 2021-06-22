import { Stage } from './stage'
export class Empty<T> extends Stage<T> {
  constructor(name?: string) {
    super(name)
    this.compiled = true
    this._config.run = (err, context, callback) => callback(err, context)
  }

  toString() {
    return '[pipeline Empty]'
  }
}
