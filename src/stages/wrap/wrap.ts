import { AllowedStage, ContextType, run_or_execute, Stage, StageObject, StageRun } from '../../stage'
import { getWrapConfig } from './getWrapConfig'
import { WrapConfig } from './WrapConfig'

export class Wrap<
  R extends StageObject,
  T extends StageObject,
  C extends WrapConfig<R, T> = WrapConfig<R, T>,
> extends Stage<R, C> {
  constructor(config?: AllowedStage<R, C>) {
    super()
    if (config) {
      this._config = getWrapConfig<R, T, C>(config)
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
            done(undefined, result ? result : context)
          } else {
            done(err, context)
          }
        })
      }
    }

    this.run = run

    return super.compile(rebuild)
  }
  protected prepare(ctx: ContextType<R>): ContextType<T> {
    if (this.config.prepare) {
      return this.config.prepare(ctx) ?? ctx as unknown as ContextType<T>
    } else {
      return ctx as unknown as ContextType<T>
    }
  }
  protected finalize(ctx: ContextType<R>, retCtx: ContextType<T>): ContextType<R> | void {
    // by default the main context will be used to return;
    if (this.config.finalize) {
      return this.config.finalize(ctx, retCtx)
    } else {
      // so we do nothing here
      return ctx
    }
  }
}
