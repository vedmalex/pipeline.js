import {
  CallbackFunction,
  IStage,
  ParallelConfigInput,
  ParallelConfig,
  StageRun,
} from './utils/types'
import { Stage } from './stage'
import { CreateError } from './ErrorList'

/**
 * Process staging in parallel way
 * ### config as _Object_
 *
 * - `stage`
 * 		evaluating stage
 * - `split`
 *		function that split existing stage into smalls parts, it needed
 * - `combine`
 * 		if any result combining is need, this can be used to combine splited parts and update context
 *
 * > **Note**
 * 		`split` does not require `combine` it will return parent context;
 * 		in cases that have no declaration for `split` configured or default will be used
 *
 * @param {Object} config configuration object
 */
export class Parallel<
  T,
  R,
  I extends ParallelConfigInput<T, R> = ParallelConfigInput<T, R>,
  S extends ParallelConfig<T, R> = ParallelConfig<T, R>,
> extends Stage<T, R, I, S> {
  constructor(_config?: I | Stage<T, R, I, S>) {
    let config: S = {} as S
    if (_config instanceof Stage) {
      super()
      this.config.stage = _config
    } else if (typeof _config == 'object') {
      if (_config?.run instanceof Function) {
        config.stage = new Stage(_config.run) as IStage<T, R>
        delete _config.run
      } else if (_config?.stage instanceof Stage) {
        config.stage = _config.stage
        delete _config.stage
      } else if (_config?.stage instanceof Function) {
        config.stage = new Stage(_config.stage) as IStage<T, R>
        delete _config.stage
      } else {
        config.stage = new Empty()
      }
      if (_config.split instanceof Function) {
        config.split = _config.split
        delete _config.split
      }
      if (_config.combine instanceof Function) {
        config.combine = _config.combine
        delete _config.combine
      }
      super(_config)
      this._config = { ...this._config, ...config }
    } else {
      super()
    }
  }

  split(ctx: T | R): Array<any> {
    return this._config.split ? this._config.split(ctx) : [ctx]
  }

  combine(ctx: T | R, children: Array<any>): T | R {
    let res: T | R
    if (this.config.combine) {
      let c = this.config.combine(ctx, children)
      res = c ?? ctx
    } else {
      res = ctx
    }
    return res
  }

  public override get reportName() {
    return `PLL:${this.config.name ? this.config.name : ''}`
  }
  public override toString() {
    return '[pipeline Pipeline]'
  }

  public override get name(): string {
    return this._config.name ?? this._config.stage?.name ?? ''
  }

  override compile(rebuild: boolean = false): StageRun<T, R> {
    if (this.config.stage) {
      var run: StageRun<T, R> = (
        err: Error | undefined,
        ctx: T | R,
        done: CallbackFunction<T | R>,
      ) => {
        var iter = 0
        var children = this.split(ctx)
        var len = children ? children.length : 0
        let errors: Array<StageError<ParallelError>>
        let hasError = false

        var next = (index: number) => {
          return (err: Error | undefined, retCtx: any) => {
            if (!err) {
              children[index] = retCtx
            } else {
              if (!hasError) {
                hasError = true
                errors = []
              }
              errors.push(
                new StageError({
                  name: 'Parallel stage Error',
                  stage: this.name,
                  index: index,
                  err: err,
                  ctx: children[index],
                }),
              )
            }

            if (++iter >= len) {
              if (!hasError) {
                let result = this.combine(ctx, children)
                return done(undefined, result)
              } else {
                return done(CreateError(errors), ctx)
              }
            }
          }
        }

        if (len === 0) {
          return done(err, ctx)
        } else {
          for (var i = 0; i < len; i++) {
            this.config.stage.execute(err, children[i], next(i))
          }
        }
      }
      this.run = run
    } else {
      this.run = function (
        err: Error | undefined,
        context: T | R,
        done: CallbackFunction<T | R>,
      ) {
        done(err, context)
      }
    }

    return super.compile()
  }
}

export type ParallelError = {
  name: string
  stage: string
  index: number
  err: Error
  ctx: any
}
export class StageError<T extends { name: string }> extends Error {
  info!: T
  constructor(err: T) {
    super(err.name)
    this.info = err
  }
}
