import { Stage } from './stage'
import { empty_run } from './utils/empty_run'
import { run_or_execute } from './utils/run_or_execute'
import { AllowedStage, getParallelConfig, ParallelConfig, StageRun } from './utils/types/types'

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
export class Sequential<R, C extends ParallelConfig<R>> extends Stage<R, C> {
  constructor(config?: AllowedStage<R, C>) {
    super()
    if (config) {
      this._config = getParallelConfig(config)
    }
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

  override compile(rebuild: boolean = false): StageRun<R> {
    if (this.config.stage) {
      var run: StageRun<R> = (err, ctx, done) => {
        var iter = -1
        var children = this.split ? this.split(ctx) : [ctx]
        var len = children ? children.length : 0

        var next = (err: unknown, retCtx?: unknown) => {
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
            run_or_execute(this.config.stage, err, children[iter], next)
          }
        }

        if (len === 0) {
          return done(err, ctx)
        } else {
          next(err)
        }
      }

      this.run = run as StageRun<R>
    } else {
      this.run = empty_run
    }

    return super.compile()
  }
  protected split(ctx: unknown): Array<unknown> {
    return this._config.split ? this._config.split(ctx as R) : [ctx]
  }

  protected combine(ctx: unknown, children: Array<unknown>): unknown {
    let res: unknown
    if (this.config.combine) {
      let c = this.config.combine(ctx as R, children)
      res = c ?? ctx
    } else {
      res = ctx
    }
    return res
  }
}
