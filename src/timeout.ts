import { Stage } from './stage'
import { AllowedStage, getTimeoutConfig } from './utils/types'
import { CallbackFunction, StageRun, TimeoutConfig } from './utils/types'
import { run_or_execute } from './utils/run_or_execute'

export class Timeout<
  T = any,
  C extends TimeoutConfig<T, R> = any,
  R = T,
> extends Stage<T, C, R> {
  constructor(config?: AllowedStage<T, C, R>) {
    super()
    if (config) {
      this._config = getTimeoutConfig(config)
    }
  }

  public override get reportName() {
    return `Templ:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline Timeout]'
  }

  override compile(rebuild: boolean = false): StageRun<T, R> {
    let run: StageRun<T, R> = (
      err: Error | undefined,
      ctx: T | R,
      done: CallbackFunction<T | R>,
    ) => {
      let to: any
      let localDone = function (
        err: Error | undefined,
        retCtx: T | R | undefined,
      ) {
        if (to) {
          clearTimeout(to)
          to = null
          return done(err, retCtx)
        }
      }
      let waitFor

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

    this.run = run

    return super.compile(rebuild)
  }
}
