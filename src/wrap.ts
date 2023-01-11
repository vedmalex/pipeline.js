import { ContextType } from './context'
import { Stage } from './stage'
import { ComplexError } from './utils/ErrorList'
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

export class Wrap<T extends StageObject, R extends StageObject> extends Stage<
  T,
  WrapConfig<T, R>
> {
  constructor(config?: AllowedStage<T, R, WrapConfig<T, R>>) {
    super()
    if (config) {
      this._config = getWrapConfig<T, R, WrapConfig<T, R>>(config)
    }
  }

  public override get reportName() {
    return `Wrap:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline Wrap]'
  }

  override compile(rebuild: boolean = false): StageRun<T> {
    let run = (
      err: Possible<ComplexError>,
      context: ContextType<T>,
      done: CallbackFunction<T>,
    ) => {
      const ctx = this.prepare(context)
      if (this.config.stage) {
        run_or_execute<any>(this.config.stage, err, ctx, ((
          err: Possible<ComplexError>,
          retCtx: ContextType<R>,
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
  prepare(ctx: ContextType<T>): unknown {
    if (this.config.prepare) {
      return this.config.prepare(ctx) ?? ctx
    } else {
      return ctx
    }
  }
  finalize(ctx: ContextType<T>, retCtx: ContextType<R>): ContextType<T> {
    // by default the main context will be used to return;
    if (this.config.finalize) {
      return this.config.finalize(ctx, retCtx)
    } else {
      // so we do nothing here
      return ctx
    }
  }
}
