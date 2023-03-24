import { Context } from './context'
import { Stage } from './stage'
import { run_or_execute } from './utils/run_or_execute'
import { AllowedStage, AnyStage, StageRun, RetryOnErrorConfig, getRetryOnErrorConfig } from './utils/types/types'

export class RetryOnError<R, C extends RetryOnErrorConfig<R>> extends Stage<R, C> implements AnyStage {
  constructor(config?: AllowedStage<R, C>) {
    super()
    if (config) {
      this._config = getRetryOnErrorConfig(config)
    }
  }

  public override get reportName() {
    return `Templ:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline RetryOnError]'
  }

  protected backupContext(ctx: unknown): unknown {
    if (this.config.backup) {
      return this.config.backup(ctx)
    } else {
      if (Context.isContext(ctx)) {
        return ctx.fork({})
      } else {
        return ctx
      }
    }
  }

  protected restoreContext(ctx: unknown, backup: unknown): unknown {
    if (this.config.restore) {
      return this.config.restore(ctx, backup)
    } else {
      if (Context.isContext(ctx) && typeof backup === 'object' && backup !== null) {
        for (let key in backup) {
          ctx[key] = backup[key]
        }
        return ctx
      } else {
        return backup
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
            return !this.config.retry(err, ctx, iter)
          } else {
            // number
            return iter > this.config.retry
          }
        } else {
          return true
        }
      }
      let iter = -1

      let next = (err: unknown, _ctx: unknown) => {
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
