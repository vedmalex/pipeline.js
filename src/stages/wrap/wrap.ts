import { AllowedStage, makeCallback, makeCallbackArgs, run_or_execute, Stage, StageRun } from '../../stage'
import { getWrapConfig } from './getWrapConfig'
import { WrapConfig } from './WrapConfig'

export class Wrap<
  Input,
  Output,
  T,
  Config extends WrapConfig<Input, Output, T> = WrapConfig<Input, Output, T>,
> extends Stage<Input, Output, Config> {
  constructor(config?: AllowedStage<Input, Output, Config>) {
    super()
    if (config) {
      this._config = getWrapConfig<Input, Output, T, Config>(config)
    }
  }

  public override get reportName() {
    return `Wrap:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline Wrap]'
  }

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
      return this.config.prepare(ctx) ?? ctx as unknown as T
    } else {
      return ctx as unknown as T
    }
  }
  protected finalize(ctx: Input, retCtx: unknown): Output | void {
    // by default the main context will be used to return;
    if (this.config.finalize) {
      return this.config.finalize(ctx, retCtx)
    } else {
      // so we do nothing here
      return ctx as unknown as Output
    }
  }
}
