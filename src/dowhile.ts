import { Stage } from './stage'
import { run_or_execute } from './utils/run_or_execute'
import { AnyStage, DoWhileConfig, getDoWhileConfig } from './utils/types/types'
import { SingleStageFunction, StageRun } from './utils/types/types'

export class DoWhile<R, C extends DoWhileConfig<R>> extends Stage<R, C> {
  constructor()
  constructor(stage: AnyStage)
  constructor(config: C)
  constructor(stageFn: SingleStageFunction<R>)
  constructor(config?: AnyStage | C | SingleStageFunction<R>) {
    super()
    if (config) {
      this._config = getDoWhileConfig(config)
    }
  }

  public override get reportName() {
    return `WHI:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline DoWhile]'
  }
  reachEnd<T>(err: unknown, ctx: T, iter: number): boolean {
    if (this.config.reachEnd) {
      let result = this.config.reachEnd(err, ctx, iter)
      if (typeof result === 'boolean') {
        return result
      } else {
        throw new Error('reachEnd return unexpected value')
      }
    } else return true
  }

  split<T>(ctx: T, iter: number): any {
    if (this.config.split) {
      return this.config.split(ctx, iter)
    } else return ctx
  }

  override compile(rebuild: boolean = false): StageRun<R> {
    let run: StageRun<R> = (err, context, done) => {
      let iter: number = -1
      let next = (err: unknown) => {
        iter++
        if (this.reachEnd(err, context, iter)) {
          return done(err, context as R)
        } else {
          run_or_execute(this.config.stage, err, this.split(context, iter), next)
        }
      }
      next(err)
    }

    this.run = run as StageRun<R>

    return super.compile(rebuild)
  }
}
