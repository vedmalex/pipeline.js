import { Stage } from './stage'
import { ComplexError, CreateError } from './utils/ErrorList'
import { run_or_execute } from './utils/run_or_execute'
import { ContextType } from './context'
import { isAnyStage } from './utils/types'
import {
  AnyStage,
  CallbackFunction,
  Func2Sync,
  Func3Sync,
  Possible,
  SingleStageFunction,
  StageConfig,
  StageObject,
  StageRun,
} from './utils/types'

export interface DoWhileConfig<T extends StageObject, R extends StageObject>
  extends StageConfig<T> {
  stage: AnyStage<T, R> | SingleStageFunction<T>
  split?: Func2Sync<T, Possible<T>, number>
  reachEnd?: Func3Sync<boolean, Possible<ComplexError>, Possible<T>, number>
}

export class DoWhile<
  T extends StageObject,
  R extends StageObject,
> extends Stage<T, DoWhileConfig<T, R>> {
  constructor()
  constructor(stage: Stage<T, StageConfig<T>>)
  constructor(config: DoWhileConfig<T, R>)
  constructor(stageFn: SingleStageFunction<T>)
  constructor(
    _config?:
      | Stage<T, StageConfig<T>>
      | DoWhileConfig<T, R>
      | SingleStageFunction<T>,
  ) {
    let config: DoWhileConfig<T, R> = {} as DoWhileConfig<T, R>
    if (isAnyStage<T, R>(_config)) {
      config.stage = _config
    } else if (typeof _config == 'function') {
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

  reachEnd(
    err: Possible<ComplexError>,
    ctx: Possible<T>,
    iter: number,
  ): boolean {
    if (this.config.reachEnd) {
      return this.config.reachEnd(err, ctx, iter)
    } else return true
  }

  split(ctx: Possible<T>, iter: number): any {
    if (this.config.split) {
      return this.config.split(ctx, iter)
    } else return ctx
  }

  override compile(rebuild: boolean = false): StageRun<any> {
    let run: StageRun<any> = (
      err: Possible<ComplexError>,
      context: ContextType<T>,
      done: CallbackFunction<T>,
    ) => {
      let iter: number = -1
      let next = (err: Possible<ComplexError>) => {
        iter++
        if (this.reachEnd(err, context, iter)) {
          return done(err, context)
        } else {
          run_or_execute<T>(
            this.config.stage,
            err,
            this.split(context, iter),
            next as CallbackFunction<T>,
          )
        }
      }
      next(err)
    }

    this.run = run

    return super.compile(rebuild)
  }
}
