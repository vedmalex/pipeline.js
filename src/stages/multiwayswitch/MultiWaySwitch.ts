import {
  CallbackFunction,
  makeCallback,
  makeCallbackArgs,
  Possible,
  run_or_execute,
  Stage,
  StageRun,
} from '../../stage'
import { MultWaySwitchConfig } from './MultWaySwitchConfig'

export class MultiWaySwitch<
  Input,
  Output,
  TConfig extends MultWaySwitchConfig<Input, Output> = MultWaySwitchConfig<Input, Output>,
> extends Stage<Input, Output, TConfig> {
  override compile(rebuild: boolean = false): StageRun<Input, Output> {
    let run: StageRun<Input, Output> = (err, ctx, done) => {
      let iter = 0
      let errors: Array<Error> = []
      let hasError = false
      let next = (index: number) => {
        return makeCallback((err: unknown, retCtx: unknown) => {
          iter++
          let cur = this.config.cases[index]
          let res: Possible<Output> = null
          if (err) {
            if (!hasError) {
              hasError = true
            }
            errors.push(err as Error)
          } else {
            if (cur.config.combine) {
              res = cur.config.combine(ctx, retCtx)
              if(!res) throw new Error('combine MUST return value')
            }
          }

          if (iter >= this.config.cases.length) {
            return done(makeCallbackArgs(hasError ? errors : undefined, res ?? ctx as unknown as Output))
          }
        })
      }

      for (let i = 0; i < this.config.cases.length; i++) {
        let stg = this.config.cases[i]
        let lctx = stg.config.split?.(ctx) ?? ctx as unknown
        run_or_execute(stg.config.stage, err, lctx, next(i) as CallbackFunction<unknown, unknown>)
      }

      if (this.config.cases.length === 0) {
        return done(makeCallbackArgs(err, ctx as unknown as Output))
      }
    }

    this.run = run

    return super.compile(rebuild)
  }
}
