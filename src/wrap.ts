import { Stage } from './stage'
import { run_or_execute } from './utils/run_or_execute'
import { getWrapConfig, AllowedStage, WrapConfig, StageRun } from './utils/types/types'

export class Wrap<R, C extends WrapConfig<R>> extends Stage<R, C> {
  constructor(config?: AllowedStage<R, C>) {
    super()
    if (config) {
      this._config = getWrapConfig(config)
    }
  }

  public override get reportName() {
    return `Wrap:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline Wrap]'
  }

  override compile(rebuild: boolean = false): StageRun<R> {
    let run: StageRun<R> = (err, context, done) => {
      const ctx = this.prepare(context)
      if (this.config.stage) {
        run_or_execute(this.config.stage, err, ctx, (err, retCtx) => {
          if (!err) {
            const result = this.finalize(context, retCtx ?? ctx)
            done(undefined, (result ?? context) as R)
          } else {
            done(err, context as R)
          }
        })
      }
    }

    this.run = run

    return super.compile(rebuild)
  }
  protected prepare(ctx: unknown): unknown {
    if (this.config.prepare) {
      return this.config.prepare(ctx) ?? ctx
    } else {
      return ctx
    }
  }
  protected finalize(ctx: unknown, retCtx: unknown): unknown {
    // by default the main context will be used to return;
    if (this.config.finalize) {
      return this.config.finalize(ctx, retCtx)
    } else {
      // so we do nothing here
      return ctx
    }
  }
}
