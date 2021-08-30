import {
  CallbackFunction,
  ParallelConfig,
  AllowedStage,
  StageRun,
  getParallelConfig,
  Possible,
} from './utils/types'
import { Stage } from './stage'
import { run_or_execute } from './utils/run_or_execute'
import { empty_run } from './utils/empty_run'
import { StageError } from './utils/ErrorList'

/**
 * Process staging in Sequential way
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
export class Sequential<T, R = T> extends Stage<T, ParallelConfig<T, R>, R> {
  constructor(config?: AllowedStage<T, ParallelConfig<T, R>, R>) {
    super()
    if (config) {
      this._config = getParallelConfig(config)
    }
  }

  split(ctx: Possible<T>): Array<any> {
    return this._config.split ? this._config.split(ctx) : [ctx]
  }

  combine(ctx: Possible<T>, children: Array<any>): Possible<R> {
    let res: Possible<R>
    if (this.config.combine) {
      let c = this.config.combine(ctx, children)
      res = c ?? (ctx as Possible<R>)
    } else {
      res = ctx as Possible<R>
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
        err: Possible<Error>,
        ctx: Possible<T>,
        done: CallbackFunction<R>,
      ) => {
        var iter = -1
        var children = this.split ? this.split(ctx) : [ctx]
        var len = children ? children.length : 0

        var next = (err: Possible<Error>, retCtx: any) => {
          if (err) {
            return done(
              new StageError<SequentialError<T, R>>({
                name: 'Sequential stage Error',
                stage: this.config,
                index: iter,
                err: err,
                ctx: children[iter],
              }),
            )
          }

          if (retCtx) {
            children[iter] = retCtx
          }

          iter += 1
          if (iter >= len) {
            let result = this.combine(ctx, children)
            return done(undefined, result as unknown as R)
          } else {
            run_or_execute<T, R, R, R>(
              this.config.stage,
              err,
              children[iter],
              next,
            )
          }
        }

        if (len === 0) {
          return done(err, ctx as unknown as R)
        } else {
          next(err, ctx)
        }
      }

      this.run = run
    } else {
      this.run = empty_run
    }

    return super.compile()
  }
}

export type SequentialError<T, R> = {
  name: string
  stage: ParallelConfig<T, R>
  index: number
  err: Error
  ctx: any
}
