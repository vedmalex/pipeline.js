import { Context, ContextType } from './context'
import { Stage } from './stage'
import { ComplexError, CreateError } from './utils/ErrorList'
import { run_or_execute } from './utils/run_or_execute'
import {
  AllowedStage,
  AnyStage,
  getStageConfig,
  Possible,
  RunPipelineFunction,
  StageObject,
} from './utils/types'
import {
  CallbackFunction,
  Func3,
  StageConfig,
  StageRun,
  isAnyStage,
} from './utils/types'

export interface RetryOnErrorConfig<T extends StageObject>
  extends StageConfig<T> {
  stage: AnyStage<T> | RunPipelineFunction<T>
  retry: number | Func3<boolean, Possible<ComplexError>, ContextType<T>, number>
  backup?: (ctx: ContextType<T>) => ContextType<T>
  restore?: (ctx: ContextType<T>, backup: ContextType<T>) => ContextType<T>
}

export function getRetryOnErrorConfig<
  T extends StageObject,
  C extends RetryOnErrorConfig<T>,
>(config: AllowedStage<T, T, C>): C {
  const res = getStageConfig<T, T, C>(config)
  if (isAnyStage<T, C>(res)) {
    return { stage: res } as C
  } else if (typeof config == 'object' && !isAnyStage<T, C>(config)) {
    if (config.run && config.stage) {
      throw CreateError("don't use run and stage both")
    }
    if (config.run) {
      res.stage = config.run
    }
    if (config.stage) {
      res.stage = config.stage
    }
    if (config.backup) {
      res.backup = config.backup
    }
    if (config.restore) {
      res.restore = config.restore
    }
    if (config.retry) {
      if (typeof config.retry !== 'function') {
        config.retry *= 1 // To get NaN is wrong type
      }
      res.retry = config.retry
    }
    if (!res.retry) res.retry = 1
  } else if (typeof config == 'function' && res.run) {
    res.stage = res.run
    delete res.run
  }
  return res
}

export class RetryOnError<T extends StageObject> extends Stage<
  T,
  RetryOnErrorConfig<T>
> {
  constructor(config?: AllowedStage<T, T, RetryOnErrorConfig<T>>) {
    super()
    if (config) {
      this._config = getRetryOnErrorConfig<T, RetryOnErrorConfig<T>>(config)
    }
  }

  public override get reportName() {
    return `Templ:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline RetryOnError]'
  }

  backupContext(ctx: ContextType<T>): ContextType<T> {
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

  restoreContext(ctx: ContextType<T>, backup: ContextType<T>): ContextType<T> {
    if (this.config.restore) {
      return this.config.restore(ctx, backup)
    } else {
      if (Context.isContext(ctx)) {
        for (let key in backup) {
          ;(ctx as any)[key] = backup[key]
        }
        return ctx
      } else {
        return backup
      }
    }
  }

  override compile(rebuild: boolean = false): StageRun<T> {
    let run: StageRun<T> = (
      err: Possible<ComplexError>,
      ctx: ContextType<T>,
      done: CallbackFunction<T>,
    ) => {
      /// ловить ошибки
      // backup context object to overwrite if needed
      let backup = this.backupContext(ctx)

      const reachEnd = (err: Possible<ComplexError>, iter: number) => {
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

      let next = (err: Possible<ComplexError>, _ctx: ContextType<T>) => {
        iter++
        if (reachEnd(err, iter)) {
          return done(err, _ctx ?? ctx)
        } else {
          // clean changes of existing before values.
          // may be will need to clear at all and rewrite ? i don't know yet.
          const res = this.restoreContext(_ctx ?? ctx, backup)
          run_or_execute(
            this.config.stage,
            err,
            res ?? ctx,
            next as CallbackFunction<T>,
          )
        }
      }
      run_or_execute(this.config.stage, err, ctx, next as CallbackFunction<T>)
    }

    this.run = run

    return super.compile(rebuild)
  }
}
