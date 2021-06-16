import { Stage } from './stage'

export class Empty extends Stage {
  constructor(name?: string) {
    super(name)
    this.run = (err, context, callback) => callback(err, context)
  }

  toString() {
    return '[pipeline Empty]'
  }
}
