import { Stage } from './stage'
import { run_or_execute } from './utils/run_or_execute'
import { AllowedStage, getTimeoutConfig, StageObject } from './utils/types'
import {
  CallbackFunction,
  Possible,
  StageRun,
  TimeoutConfig,
} from './utils/types'

export class Timeout<T extends StageObject, R = T> extends Stage<
  T,
  TimeoutConfig<T, R>,
  R
> {
  constructor(config?: AllowedStage<T, TimeoutConfig<T, R>, R>) {
    super()
    if (config) {
      this._config = getTimeoutConfig<T, R>(config)
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
      err: Possible<Error>,
      ctx: Possible<T>,
      done: CallbackFunction<R>,
    ) => {
      let to: any
      let localDone = function (err: Possible<Error>, retCtx: Possible<R>) {
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
              run_or_execute<T, R, T, R>(
                this.config.overdue,
                err,
                ctx,
                localDone,
              )
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
