import { cloneDeep } from 'lodash'

import { Stage } from './stage'
import {
  AllowedStage,
  getStageConfig,
  RunPipelineFunction,
} from './utils/types'
import { CallbackFunction, StageConfig, StageRun, Func3 } from './utils/types'
import { CreateError } from './utils/ErrorList'
import { run_or_execute } from './utils/run_or_execute'

export interface RetryOnErrorConfig<T, R> extends StageConfig<T, R> {
  stage: Stage<T, any, R> | RunPipelineFunction<T, R>
  retry: number | Func3<boolean, Error | undefined, T | R, number>
  backup: Function
  restore: Function
}

export function getRetryOnErrorConfig<T, C extends RetryOnErrorConfig<T, R>, R>(
  config: AllowedStage<T, C, R>,
): C {
  const res = getStageConfig(config)
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

export class RetryOnError<
  T = any,
  C extends RetryOnErrorConfig<T, R> = any,
  R = T,
> extends Stage<T, C, R> {
  constructor(config?: AllowedStage<T, C, R>) {
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

  backupContext(ctx: T | R): T | R {
    if (this.config.backup) {
      return this.config.backup(ctx)
    } else {
      return cloneDeep(ctx)
    }
  }

  restoreContext(ctx: T | R, backup: T | R): T | R {
    if (this.config.restore) {
      return this.config.restore(ctx, backup)
    } else {
      return backup
    }
  }

  override compile(rebuild: boolean = false): StageRun<T, R> {
    let run: StageRun<T, R> = (
      err: Error | undefined,
      ctx: T | R,
      done: CallbackFunction<T | R>,
    ) => {
      /// ловить ошибки
      // backup context object to overwrite if needed
      let backup = this.backupContext(ctx)

      const reachEnd = (err: Error | undefined, iter: number) => {
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

      let next: CallbackFunction<T | R> = (
        err: Error | undefined,
        _ctx: T | R | undefined,
      ) => {
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

    this.run = run

    return super.compile(rebuild)
  }
}
