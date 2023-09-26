import { AllowedStage, run_or_execute, Stage, StageRun } from '../../stage'
import { getTimeoutConfig } from './getTimeoutConfig'
import { TimeoutConfig } from './TimeoutConfig'

export class Timeout<R, C extends TimeoutConfig<R> = TimeoutConfig<R>> extends Stage<R, C> {
  constructor(config?: AllowedStage<R, C>) {
    super()
    if (config) {
      this._config = getTimeoutConfig(config) as C
    }
  }

  public override get reportName() {
    return `Templ:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline Timeout]'
  }

  override compile(rebuild: boolean = false): StageRun<R> {
    let run: StageRun<R> = (err, ctx, done) => {
      let to: any
      let localDone: typeof done = (err, retCtx) => {
        if (to) {
          clearTimeout(to)
          to = null
          return done(err, retCtx)
        }
      }
      let waitFor: number | undefined

      if (this.config.timeout instanceof Function) {
        waitFor = this.config.timeout(ctx)
      } else {
        waitFor = this.config.timeout
      }
      if (waitFor) {
        to = setTimeout(() => {
          if (to) {
            if (this.config.overdue) {
              run_or_execute(this.config.overdue, err, ctx, localDone)
            }
          }
          /* else {
            here can be some sort of caching operation
          }*/
        }, waitFor)
        if (this.config.stage) {
          run_or_execute(this.config.stage, err, ctx, localDone)
        }
      } else {
        if (this.config.stage) {
          run_or_execute(this.config.stage, err, ctx, done)
        }
      }
    }

    this.run = run as StageRun<R>

    return super.compile(rebuild)
  }
}
