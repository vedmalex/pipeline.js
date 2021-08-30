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
  AnyStage,
  Possible,
} from './utils/types'

export interface DoWhileConfig<T, R> extends StageConfig<T, R> {
  stage: AnyStage<any, any> | SingleStageFunction<any, any>
  split?: Func2Sync<any, Possible<T>, number>
  reachEnd?: Func3Sync<boolean, Possible<Error>, Possible<T>, number>
}

export class DoWhile<T, R = T> extends Stage<T, DoWhileConfig<T, R>, R> {
  constructor(
    _config?:
      | DoWhileConfig<T, R>
      | Stage<T, DoWhileConfig<T, R>, R>
      | SingleStageFunction<T, R>,
  ) {
    let config: DoWhileConfig<T, R> = {} as DoWhileConfig<T, R>
    if (_config instanceof Stage) {
      config.stage = _config as AnyStage<any, any>
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

  reachEnd(err: Possible<Error>, ctx: Possible<T>, iter: number): boolean {
    if (this.config.reachEnd) {
      return this.config.reachEnd(err, ctx, iter)
    } else return true
  }

  split(ctx: Possible<T>, iter: number): any {
    if (this.config.split) {
      return this.config.split(ctx, iter)
    } else return ctx
  }

  override compile(rebuild: boolean = false): StageRun<any, any> {
    let run: StageRun<any, any> = (
      err: Possible<Error>,
      context: Possible<T>,
      done: CallbackFunction<T>,
    ) => {
      let iter: number = -1
      let next = (err: Possible<Error>) => {
        iter++
        if (this.reachEnd(err, context, iter)) {
          return done(err, context)
        } else {
          run_or_execute<T, any, any, any>(
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
