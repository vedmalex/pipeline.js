import {
  Stage,
  AnyStage,
  AllowedStage,
  Context,
  StageRun,
  ComplexError,
  run_or_execute,
  StageObject,
  ContextType,
} from '../../stage'
import { RetryOnErrorConfig } from './RetryOnErrorConfig'
import { getRetryOnErrorConfig } from './getRetryOnErrorConfig'

export class RetryOnError<
    R extends StageObject,
    T extends StageObject,
    C extends RetryOnErrorConfig<R, T> = RetryOnErrorConfig<R, T>,
  >
  extends Stage<R, C>
  implements AnyStage<R>
{
  constructor(config?: AllowedStage<R, C>) {
    super()
    if (config) {
      this._config = getRetryOnErrorConfig<R, T, C>(config)
    }
  }

  public override get reportName() {
    return `Templ:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline RetryOnError]'
  }

  protected backupContext(ctx: ContextType<R>): ContextType<T> {
    if (this.config.backup) {
      return this.config.backup(ctx)
    } else {
      if (Context.isContext(ctx)) {
        return ctx.fork({}) as ContextType<T>
      } else {
        return ctx
      }
    }
  }

  protected restoreContext(ctx: ContextType<R>, backup: ContextType<T>): ContextType<R> {
    if (this.config.restore) {
      return this.config.restore(ctx, backup)
    } else {
      if (Context.isContext(ctx) && typeof backup === 'object' && backup !== null) {
        for (let key in backup) {
          //@ts-expect-error
          ctx[key] = backup[key]
        }
        return ctx
      } else {
        return backup as unknown as ContextType<R>
      }
    }
  }

  override compile(rebuild: boolean = false): StageRun<R> {
    let run: StageRun<R> = (err, ctx, done) => {
      /// ловить ошибки
      // backup context object to overwrite if needed
      let backup = this.backupContext(ctx)

      const reachEnd = (err: unknown, iter: number) => {
        if (err) {
          if (this.config.retry instanceof Function) {
            return !this.config.retry(err as ComplexError, ctx, iter)
          } else {
            // number
            return iter > (this.config.retry ?? 1)
          }
        } else {
          return true
        }
      }
      let iter = -1

      let next: typeof done = (err, _ctx) => {
        iter++
        if (reachEnd(err, iter)) {
          return done(err, _ctx ?? ctx)
        } else {
          // clean changes of existing before values.
          // may be will need to clear at all and rewrite ? i don't know yet.
          const res = this.restoreContext(_ctx ?? ctx, backup)
          run_or_execute(this.config.stage, err, res ?? ctx, next)
        }
      }
      run_or_execute(this.config.stage, err, ctx, next)
    }

    this.run = run as StageRun<R>

    return super.compile(rebuild)
  }
}
