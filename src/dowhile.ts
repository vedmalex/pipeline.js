import { Stage } from './stage'
import { CreateError } from './utils/ErrorList'
import { run_or_execute } from './utils/run_or_execute'
import {
  SingleStageFunction,
  CallbackFunction,
  StageConfig,
  StageRun,
  Func2Sync,
  Func3Sync,
} from './utils/types'

export interface DoWhileConfig<T, C, R> extends StageConfig<T, R> {
  stage: Stage<T, C, R> | SingleStageFunction<T>
  split?: Func2Sync<T | R, T | R, number>
  reachEnd?: Func3Sync<boolean, Error | undefined, T | R, number>
}

export class DoWhile<
  T = any,
  C extends DoWhileConfig<T, C, R> = any,
  R = T,
> extends Stage<T, C, R> {
  stages!: Array<Stage<any, any, any>>

  constructor(_config?: C | Stage<T, C, R> | SingleStageFunction<T>) {
    let config: C = {} as C
    if (_config instanceof Stage) {
      config.stage = _config
    } else {
      if (typeof _config == 'function') {
        config.stage = _config
      } else {
        if (_config?.run && _config?.stage) {
          throw CreateError('use or run or stage, not both')
        }

        if (_config?.stage) {
          config.stage = _config.stage
        }

        if (_config?.split instanceof Function) {
          config.split = _config.split
        }

        if (_config?.reachEnd instanceof Function) {
          config.reachEnd = _config.reachEnd
        }
      }
    }
    super(config)
    this._config = {
      ...this._config,
      ...config,
    }
  }

  public override get reportName() {
    return `WHI:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline DoWhile]'
  }

  reachEnd(err: Error | undefined, ctx: T | R, iter: number): boolean {
    if (this.config.reachEnd) {
      return this.config.reachEnd(err, ctx, iter)
    } else return true
  }

  split(ctx: T | R, iter: number): T | R {
    if (this.config.split) {
      return this.config.split(ctx, iter)
    } else return ctx
  }

  override compile(rebuild: boolean = false): StageRun<T, R> {
    let run: StageRun<T, R> = (
      err: Error | undefined,
      context: T | R,
      done: CallbackFunction<T | R>,
    ) => {
      let iter: number = -1
      let next = (err: Error | undefined) => {
        iter++
        if (this.reachEnd(err, context, iter)) {
          return done(err, context)
        } else {
          run_or_execute(
            this.config.stage,
            err,
            this.split(context, iter),
            next,
          )
        }
      }
      next(err)
    }

    this.run = run

    return super.compile(rebuild)
  }
}
