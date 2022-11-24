import { Stage } from './stage'
import { run_or_execute } from './utils/run_or_execute'
import {
  getWrapConfig,
  Possible,
  StageObject,
  AllowedStage,
  CallbackFunction,
  StageRun,
  WrapConfig,
} from './utils/types'

export class Wrap<T extends StageObject> extends Stage<T, WrapConfig<T>> {
  constructor(config?: AllowedStage<T, WrapConfig<T>>) {
    super()
    if (config) {
      this._config = getWrapConfig<T, WrapConfig<T>>(config)
    }
  }

  public override get reportName() {
    return `Wrap:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline Wrap]'
  }

  override compile(rebuild: boolean = false): StageRun<T> {
    let run: StageRun<T> = (
      err: Possible<Error>,
      context: T,
      done: CallbackFunction<T>,
    ) => {
      const ctx = this.prepare(context)
      if (this.config.stage) {
        run_or_execute(this.config.stage, err, ctx, ((
          err: Possible<Error>,
          retCtx: T,
        ) => {
          if (!err) {
            const result = this.finalize(context, retCtx ?? ctx)
            done(undefined, result ?? context)
          } else {
            done(err, context)
          }
        }) as CallbackFunction<T>)
      }
    }

    this.run = run

    return super.compile(rebuild)
  }
  prepare(ctx: T): T {
    if (this.config.prepare) {
      return this.config.prepare(ctx) ?? ctx
    } else {
      return ctx
    }
  }
  finalize(ctx: Possible<T>, retCtx: Possible<T>): Possible<T> {
    // by default the main context will be used to return;
    if (this.config.finalize) {
      return this.config.finalize(ctx, retCtx)
    } else {
      // so we do nothing here
      return ctx
    }
  }
}
