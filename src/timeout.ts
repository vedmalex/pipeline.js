import { Stage } from './stage'
import { run_or_execute } from './utils/run_or_execute'
import { AllowedStage, getTimeoutConfig } from './utils/types/types'
import { CallbackFunction, StageRun, TimeoutConfig } from './utils/types/types'

export class Timeout<R, C extends TimeoutConfig<R>> extends Stage<R, C> {
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
    let run: StageRun<R> = (err: unknown, ctx: unknown, done: CallbackFunction<R>) => {
      let to: any
      let localDone = (err: unknown, retCtx: unknown) => {
        if (to) {
          clearTimeout(to)
          to = null
          return done(err, retCtx as R)
        }
      }
      let waitFor

      if (this.config.timeout instanceof Function) {
        waitFor = this.config.timeout(ctx as R)
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
