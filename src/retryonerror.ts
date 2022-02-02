import { cloneDeep } from 'lodash'

import { Context } from './context'
import { Stage } from './stage'
import { CreateError } from './utils/ErrorList'
import { run_or_execute } from './utils/run_or_execute'
import {
  AllowedStage,
  AnyStage,
  getStageConfig,
  Possible,
  RunPipelineFunction,
} from './utils/types'
import { CallbackFunction, Func3, StageConfig, StageRun } from './utils/types'

export interface RetryOnErrorConfig<T, R> extends StageConfig<T, R> {
  stage: AnyStage<T, R> | RunPipelineFunction<T, R>
  retry: number | Func3<boolean, Possible<Error>, Possible<T>, number>
  backup?: (ctx: Possible<T>) => Possible<T>
  restore?: (ctx: Possible<T>, backup: Possible<T>) => Possible<T>
}

export function getRetryOnErrorConfig<
  T,
  C extends RetryOnErrorConfig<T, R>,
  R,
> (
  config: AllowedStage<T, C, R>,
): C {
  const res = getStageConfig<T, C, R>(config)
  if (res instanceof Stage) {
    return { stage: res } as C
  } else if (typeof config == 'object' && !(config instanceof Stage)) {
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

export class RetryOnError<T, R = T> extends Stage<
  T,
  RetryOnErrorConfig<T, R>,
  R
> {
  constructor(config?: AllowedStage<T, RetryOnErrorConfig<T, R>, R>) {
    super()
    if (config) {
      this._config = getRetryOnErrorConfig<T, RetryOnErrorConfig<T, R>, R>(
        config,
      )
    }
  }

  public override get reportName() {
    return `Templ:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline RetryOnError]'
  }

  backupContext(ctx: Possible<T>): Possible<T> {
    if (this.config.backup) {
      return this.config.backup(ctx)
    } else {
      if (Context.isContext(ctx)) {
        return ctx.toObject() as Possible<T>
      } else {
        return cloneDeep(ctx)
      }
    }
  }

  restoreContext(ctx: Possible<T>, backup: Possible<T>): Possible<T> {
    if (this.config.restore) {
      return this.config.restore(ctx, backup)
    } else {
      if (Context.isContext(ctx)) {
        for (let key in backup) {
          ;(ctx as any)[key] = backup[key]
        }
      } else {
        return backup
      }
    }
  }

  override compile(rebuild: boolean = false): StageRun<T, R> {
    let run: StageRun<T, R> = (
      err: Possible<Error>,
      ctx: Possible<T>,
      done: CallbackFunction<R>,
    ) => {
      /// ловить ошибки
      // backup context object to overwrite if needed
      let backup = this.backupContext(ctx)

      const reachEnd = (err: Possible<Error>, iter: number) => {
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

      let next: CallbackFunction<T> = (
        err: Possible<Error>,
        _ctx: Possible<T>,
      ) => {
        iter++
        if (reachEnd(err, iter)) {
          return done(err, (_ctx ?? ctx) as unknown as R)
        } else {
          // clean changes of existing before values.
          // may be will need to clear at all and rewrite ? i don't know yet.
          const res = this.restoreContext(_ctx ?? ctx, backup)
          run_or_execute<T, R, T, T>(this.config.stage, err, res ?? ctx, next)
        }
      }
      run_or_execute<T, R, T, T>(this.config.stage, err, ctx, next)
    }

    this.run = run

    return super.compile(rebuild)
  }
}
