import { Stage } from './stage'
import { run_or_execute } from './utils/run_or_execute'
import { getWrapConfig, Possible } from './utils/types'
import {
  AllowedStage,
  CallbackFunction,
  StageRun,
  WrapConfig,
} from './utils/types'

export class Wrap<T, R = T> extends Stage<T, WrapConfig<T, R>, R> {
  constructor(config?: AllowedStage<T, WrapConfig<T, R>, R>) {
    super()
    if (config) {
      this._config = getWrapConfig<T, WrapConfig<T, R>, R>(config)
    }
  }

  public override get reportName() {
    return `Wrap:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline Wrap]'
  }

  override compile(rebuild: boolean = false): StageRun<T, R> {
    let run: StageRun<T, R> = (
      err: Possible<Error>,
      context: Possible<T>,
      done: CallbackFunction<R>,
    ) => {
      const ctx = this.prepare(context)
      if (this.config.stage) {
        run_or_execute<unknown, unknown, unknown, unknown>(
          this.config.stage,
          err,
          ctx,
          (err: Possible<Error>, retCtx: unknown) => {
            if (!err) {
              const result = this.finalize(context, retCtx ?? ctx)
              done(undefined, result ?? (context as unknown as R))
            } else {
              done(err, context as unknown as R)
            }
          },
        )
      }
    }

    this.run = run

    return super.compile(rebuild)
  }
  prepare(ctx: Possible<T>): unknown {
    if (this.config.prepare) {
      return this.config.prepare(ctx) ?? ctx
    } else {
      return ctx as unknown as R
    }
  }
  finalize(ctx: Possible<T>, retCtx: unknown): Possible<R> {
    // by default the main context will be used to return;
    if (this.config.finalize) {
      return this.config.finalize(ctx, retCtx)
    } else {
      // so we do nothing here
      return ctx as unknown as R
    }
  }
}
