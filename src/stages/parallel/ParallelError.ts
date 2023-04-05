import { ParallelErrorInput } from './ParallelErrorInput'

export class ParallelError extends Error {
  override name: string
  stage?: string
  index: number
  err: unknown
  ctx: unknown
  constructor(init: ParallelErrorInput) {
    super()
    this.name = 'ParallerStageError'
    this.stage = init.stage
    this.ctx = init.ctx
    this.err = init.err
    this.index = init.index
  }
  override toString() {
    return `${this.name}: at stage ${this.stage} error occured:
    iteration ${this.index}
    ${this.err}`
  }
}
