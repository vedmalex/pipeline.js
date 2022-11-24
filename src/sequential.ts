import { Stage } from './stage'
import { empty_run } from './utils/empty_run'
import { run_or_execute } from './utils/run_or_execute'
import {
  AllowedStage,
  CallbackFunction,
  getParallelConfig,
  ParallelConfig,
  Possible,
  StageObject,
  StageRun,
} from './utils/types'

/**
 * Process staging in Sequential way
 * ### config as _Object_
 *
 * - `stage`
 * 		evaluating stage
 * - `split`
 * 		function that split existing stage into smalls parts, it needed
 * - `combine`
 * 		if any result combining is need, this can be used to combine splited parts and update context
 *
 * > **Note**
 * 		`split` does not require `combine` it will return parent context;
 * 		in cases that have no declaration for `split` configured or default will be used
 *
 * @param {Object} config configuration object
 */
export class Sequential<T extends StageObject> extends Stage<
  T,
  ParallelConfig<T>
> {
  constructor(config?: AllowedStage<T, ParallelConfig<T>>) {
    super()
    if (config) {
      this._config = getParallelConfig(config)
    }
  }

  split(ctx: T): Array<any> {
    return this._config.split ? this._config.split(ctx) : [ctx]
  }

  combine(ctx: T, children: Array<any>): T {
    let res: T
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

  override compile(rebuild: boolean = false): StageRun<T> {
    if (this.config.stage) {
      var run = (err: Possible<Error>, ctx: T, done: CallbackFunction<T>) => {
        var iter = -1
        var children = this.split ? this.split(ctx) : [ctx]
        var len = children ? children.length : 0

        var next = (err: Possible<Error>, retCtx?: Possible<T>) => {
          if (err) {
            return done(err)
          }

          if (retCtx) {
            children[iter] = retCtx
          }

          iter += 1
          if (iter >= len) {
            let result = this.combine(ctx, children)
            return done(undefined, result)
          } else {
            run_or_execute(
              this.config.stage,
              err,
              children[iter],
              next as CallbackFunction<T>,
            )
          }
        }

        if (len === 0) {
          return done(err, ctx)
        } else {
          next(err)
        }
      }

      this.run = run
    } else {
      this.run = empty_run
    }

    return super.compile()
  }
}
