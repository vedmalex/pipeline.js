import { makeCallbackArgs, run_or_execute_async, Stage, StageRun } from '../../stage'
import { DoWhileConfig } from './DoWhileConfig'

export class DoWhile<
  Input,
  Output,
  T,
  Config extends DoWhileConfig<Input, Output, T> = DoWhileConfig<Input, Output, T>,
> extends Stage<Input, Output, Config> {
  protected reachEnd(err: unknown, ctx: Input, iter: number): boolean {
    if (this.config.reachEnd) {
      let result = this.config.reachEnd(err, ctx, iter)
      return result
    } else {
      return true
    }
  }

  protected split(ctx: Input, iter: number): T {
    if (this.config.split) {
      let res = this.config.split(ctx, iter)
      if (!res) {
        throw new Error('split MUST return value')
      }
      return res
    } else {
      return ctx as unknown as T
    }
  }

  override compile(rebuild: boolean = false): StageRun<Input, Output> {
    let run: StageRun<Input, Output> = async (err, context, done) => {
      let iter = -1

      const next = async (err: unknown) => {
        iter++
        let retCtx = context as unknown as Output
        while (!this.reachEnd(err, context, iter)) {
          ;[err, retCtx] = await run_or_execute_async(this.config.stage, err, this.split(context, iter))
          if (err) {
            ;[err, context] = (await this.rescue_async(err, retCtx)) as [unknown, Input]
            if (err) {
              return done(makeCallbackArgs(err))
            }
          }
          iter++
        }

        done(makeCallbackArgs(err, retCtx))
      }

      next(err)
    }

    this.run = run as StageRun<Input, Output>

    return super.compile(rebuild)
  }
}
