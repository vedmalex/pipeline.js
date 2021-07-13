import {
  CallbackFunction,
  ParallelConfig,
  AllowedStage,
  StageRun,
  getParallelConfig,
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
export class Sequential<
  T = any,
  C extends ParallelConfig<T, R> = any,
  R = T,
> extends Stage<T, C, R> {
  constructor(config?: AllowedStage<T, C, R>) {
    super()
    if (config) {
      this._config = getParallelConfig(config)
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
        var iter = -1
        var children = this.split ? this.split(ctx) : [ctx]
        var len = children ? children.length : 0

        var next = (err: Error | undefined, retCtx: any) => {
          if (err) {
            return done(
              new StageError({
                name: 'Sequential stage Error',
                stage: this.name,
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
            return done(undefined, result)
          } else {
            run_or_execute<T, C, R>(
              this.config.stage,
              err,
              children[iter],
              next,
            )
          }
        }

        if (len === 0) {
          return done(err, ctx)
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

export type SequentialError = {
  name: string
  stage: string
  index: number
  err: Error
  ctx: any
}
