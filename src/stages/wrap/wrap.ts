import { makeCallback, makeCallbackArgs, run_or_execute, Stage, StageRun } from '../../stage'
import { WrapConfig } from './WrapConfig'

export class Wrap<
  Input,
  Output,
  T,
  Config extends WrapConfig<Input, Output, T> = WrapConfig<Input, Output, T>,
> extends Stage<Input, Output, Config> {
  override compile(rebuild: boolean = false): StageRun<Input, Output> {
    let run: StageRun<Input, Output> = (err, context, done) => {
      const ctx = this.prepare(context)
      if (this.config.stage) {
        run_or_execute(
          this.config.stage,
          err,
          ctx,
          makeCallback((err, retCtx) => {
            if (!err) {
              const result = this.finalize(context, retCtx ?? ctx)
              done(makeCallbackArgs(undefined, result ?? context))
            } else {
              done(makeCallbackArgs(err, context))
            }
          }),
        )
      }
    }

    this.run = run

    return super.compile(rebuild)
  }
  protected prepare(ctx: Input): T {
    if (this.config.prepare) {
      const ret = this.config.prepare(ctx)
      if (!ret) {
        throw new Error('prepare MUST return value')
      }
      return ret
    } else {
      return ctx as unknown as T
    }
  }
  protected finalize(ctx: Input, retCtx: unknown): Output | void {
    // by default the main context will be used to return;
    if (this.config.finalize) {
      const ret = this.config.finalize(ctx, retCtx)
      if (!ret) {
        throw new Error('finalize must return value')
      }
      return ret
    } else {
      // so we do nothing here
      return ctx as unknown as Output
    }
  }
}
