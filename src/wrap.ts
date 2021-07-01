import { Stage } from './stage'
import { getWrapConfig } from './utils/types'
import { run_or_execute } from './utils/run_or_execute'
import {
  CallbackFunction,
  StageRun,
  AllowedStage,
  WrapConfig,
} from './utils/types'

export class Wrap<
  T = any,
  C extends WrapConfig<T, R> = any,
  R = T,
> extends Stage<T, C, R> {
  stages!: Array<Stage<any, any, any>>

  constructor(config?: AllowedStage<T, C, R>) {
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

  override compile(rebuild: boolean = false): StageRun<T, R> {
    let run: StageRun<T, R> = (
      err: Error | undefined,
      context: T | R,
      done: CallbackFunction<T | R>,
    ) => {
      const ctx = this.prepare(context as T)
      if (this.config.stage) {
        run_or_execute<T, C, R>(
          this.config.stage,
          err,
          ctx ?? context,
          (err: Error | undefined, retCtx: any) => {
            if (!err) {
              const result = this.finalize(ctx, retCtx)
              done(undefined, result)
            } else {
              done(err, ctx)
            }
          },
        )
      }
    }

    this.run = run

    return super.compile(rebuild)
  }
  prepare(ctx: T): T {
    if (this.config.prepare) {
      return this.config.prepare(ctx)
    } else {
      return ctx
    }
  }
  finalize(ctx: T, retCtx: R): T | R {
    if (this.config.finalize) {
      return this.config.finalize(ctx, retCtx)
    } else {
      return retCtx ?? ctx
    }
  }
}
