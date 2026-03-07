import { Stage } from './stage'
import { commitIsolatedStageContext, createIsolatedStageContext } from './utils/context_snapshot'
import { isFunction } from './utils/TypeDetectors'
import { CleanError } from './utils/ErrorList'
import { run_or_execute } from './utils/run_or_execute'
import { AllowedStage, getTimeoutConfig, StageObject } from './utils/types'
import {
  CallbackFunction,
  Possible,
  StageRun,
  TimeoutConfig,
} from './utils/types'

export class Timeout<T extends StageObject> extends Stage<T, TimeoutConfig<T>> {
  constructor(config?: AllowedStage<T, T, TimeoutConfig<T>>) {
    super()
    if (config) {
      this._config = getTimeoutConfig<T>(config)
    }
  }

  public override get reportName() {
    return `Templ:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline Timeout]'
  }

  override compile(rebuild: boolean = false): StageRun<T> {
    let run: StageRun<T> = (
      err: Possible<CleanError>,
      ctx: T,
      done: CallbackFunction<T>,
    ) => {
      let to: NodeJS.Timeout | null = null
      let isDone = false

      const finish = ((runErr: Possible<CleanError>, retCtx: T) => {
        if (isDone) return
        isDone = true
        if (to) clearTimeout(to)
        to = null
        return done(runErr, retCtx)
      }) as CallbackFunction<T>

      const waitFor =
        isFunction(this.config.timeout)
          ? this.config.timeout(ctx)
          : this.config.timeout

      if (waitFor) {
        to = setTimeout(() => {
          const timeoutRef = to
          to = null

          if (timeoutRef && this.config.overdue) {
            run_or_execute(this.config.overdue, err, ctx, finish)
          } else {
            if (!isDone) {
              finish(null, ctx)
            }
          }
        }, waitFor)

        if (this.config.stage) {
          const isolatedCtx = createIsolatedStageContext(ctx)

          try {
            run_or_execute(this.config.stage, err, isolatedCtx, ((innerErr, retCtx) => {
              if (isDone) {
                return
              }

              if (innerErr) {
                finish(innerErr, ctx)
              } else {
                finish(undefined, commitIsolatedStageContext(ctx, (retCtx ?? isolatedCtx) as T))
              }
            }) as CallbackFunction<T>)
          } catch (error) {
            if (to) clearTimeout(to)
            to = null
            finish(error as CleanError, ctx)
          }
        }
      } else if (this.config.stage) {
        run_or_execute(this.config.stage, err, ctx, done)
      } else {
        finish(null, ctx)
      }
    }

    this.run = run
    return super.compile(rebuild);
  }
}
