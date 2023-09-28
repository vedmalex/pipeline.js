import {
  AllowedStage,
  AnyStage,
  CallbackFunction,
  ComplexError,
  Context,
  run_or_execute,
  Stage,
  StageRun,
} from '../../stage'
import { getRetryOnErrorConfig } from './getRetryOnErrorConfig'
import { RetryOnErrorConfig } from './RetryOnErrorConfig'

export class RetryOnError<
  Input,
  Output,
  T,
  Config extends RetryOnErrorConfig<Input, Output, T> = RetryOnErrorConfig<Input, Output, T>,
> extends Stage<Input, Output, Config> implements AnyStage<Input, Output> {
  constructor(config?: AllowedStage<Input, Output, Config>) {
    super()
    if (config) {
      this._config = getRetryOnErrorConfig<Input, Output, T, Config>(config)
    }
  }

  public override get reportName() {
    return `Templ:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline RetryOnError]'
  }

  protected backupContext(ctx: Input): T {
    if (this.config.backup) {
      return this.config.backup(ctx)
    } else {
      if (Context.isProxy<T>(ctx)) {
        return ctx.fork<T>({} as T) as T
      } else {
        return ctx as unknown as T
      }
    }
  }

  protected restoreContext(ctx: Input, backup: T): Input {
    if (this.config.restore) {
      return this.config.restore(ctx, backup)
    } else {
      if (Context.isProxy(ctx) && typeof backup === 'object' && backup !== null) {
        for (let key in backup) {
          // @ts-expect-error
          ctx[key] = backup[key]
        }
        return ctx
      } else {
        return backup as unknown as Input
      }
    }
  }
  // TODO:
  override compile(rebuild: boolean = false): StageRun<Input, Output> {
    let run: StageRun<Input, Output> = (err, ctx, done) => {
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

      let next = (err: unknown, _ctx: Input) => {
        iter++
        if (reachEnd(err, iter)) {
          return done(err, (_ctx ?? ctx) as unknown as Output)
        } else {
          // clean changes of existing before values.
          // may be will need to clear at all and rewrite ? i don't know yet.
          const res = this.restoreContext(_ctx ?? ctx, backup)
          run_or_execute(this.config.stage, err, res ?? ctx, next as unknown as CallbackFunction<Output>)
        }
      }
      run_or_execute(this.config.stage, err, ctx, next as unknown as CallbackFunction<Output>)
    }

    this.run = run as StageRun<Input, Output>

    return super.compile(rebuild)
  }
}
