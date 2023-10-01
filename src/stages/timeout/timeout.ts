import { makeCallback, makeCallbackArgs, run_or_execute, Stage, StageRun } from '../../stage'
import { TimeoutConfig } from './TimeoutConfig'

export class Timeout<Input, Output, Config extends TimeoutConfig<Input, Output> = TimeoutConfig<Input, Output>>
  extends Stage<Input, Output, Config> {
  override compile(rebuild: boolean = false): StageRun<Input, Output> {
    let run: StageRun<Input, Output> = (err, ctx, done) => {
      let to: any
      let localDone: typeof done = makeCallback((err, retCtx) => {
        if (to) {
          clearTimeout(to)
          to = null
          return done(makeCallbackArgs(err, retCtx))
        }
      })
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

    this.run = run as StageRun<Input, Output>

    return super.compile(rebuild)
  }
}
