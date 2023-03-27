import { ContextType } from './context'
import { Stage } from './stage'
import { run_or_execute } from './utils/run_or_execute'
import { AnyStage, DoWhileConfig, getDoWhileConfig } from './utils/types/types'
import { SingleStageFunction, StageRun } from './utils/types/types'

export class DoWhile<R, T, C extends DoWhileConfig<R, T> = DoWhileConfig<R, T>> extends Stage<R, C> {
  constructor()
  constructor(stage: AnyStage<R>)
  constructor(config: C)
  constructor(stageFn: SingleStageFunction<R>)
  constructor(config?: AnyStage<R> | C | SingleStageFunction<R>) {
    super()
    if (config) {
      this._config = getDoWhileConfig<R, T, C>(config)
    }
  }

  public override get reportName() {
    return `WHI:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline DoWhile]'
  }
  protected reachEnd(err: unknown, ctx: unknown, iter: number): boolean {
    if (this.config.reachEnd) {
      let result = this.config.reachEnd(err, ctx as ContextType<R>, iter)
      if (typeof result === 'boolean') {
        return result
      } else {
        return Boolean(result)
      }
    } else return true
  }

  protected split(ctx: unknown, iter: number): any {
    if (this.config.split) {
      return this.config.split(ctx as ContextType<R>, iter)
    } else return ctx
  }

  override compile(rebuild: boolean = false): StageRun<R> {
    let run: StageRun<R> = (err, context, done) => {
      let iter: number = -1
      let next = (err: unknown) => {
        iter++
        if (this.reachEnd(err, context as R, iter)) {
          return done(err, context as R)
        } else {
          run_or_execute(this.config.stage, err, this.split(context as R, iter), next)
        }
      }
      next(err)
    }

    this.run = run as StageRun<R>

    return super.compile(rebuild)
  }
}
