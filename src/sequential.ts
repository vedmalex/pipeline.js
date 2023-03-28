import { ContextType } from './context'
import { Stage } from './stage'
import { empty_run } from './utils/empty_run'
import { /* run_or_execute, */ run_or_execute_async } from './utils/run_or_execute'
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
export class Sequential<R, T, C extends ParallelConfig<R, T> = ParallelConfig<R, T>> extends Stage<R, C> {
  constructor(config?: AllowedStage<R, C>) {
    super()
    if (config) {
      this._config = getParallelConfig<R, T, C>(config)
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

        // var next = (err: unknown, retCtx?: unknown) => {
        //   if (err) {
        //     return done(err)
        //   }

        //   if (retCtx) {
        //     children[iter] = retCtx
        //   }

        //   iter += 1
        //   if (iter >= len) {
        //     let result = this.combine(ctx, children)
        //     return done(undefined, result as R)
        //   } else {
        //     run_or_execute(this.config.stage, err, children[iter], next)
        //   }
        // }
        const next = async (err: unknown) => {
          if (err) {
            return done(err)
          }
          while (++iter < len) {
            try {
              const retCtx = await run_or_execute_async(this.config.stage, err, children[iter])
              if (retCtx) {
                children[iter] = retCtx
              }
            } catch (err) {
              return done(err)
            }
          }

          let result = this.combine(ctx, children)
          done(undefined, result as R)
        }

        if (len === 0) {
          return done(err, ctx as R)
        } else {
          // next(err)
          next(err).catch(done).then(done)
        }
      }

      this.run = run as StageRun<R>
    } else {
      this.run = empty_run
    }

    return super.compile()
  }
  protected split(ctx: unknown): Array<unknown> {
    return this._config.split ? this._config.split(ctx as ContextType<R>) ?? [ctx] : [ctx]
  }

  protected combine(ctx: unknown, children: Array<unknown>): unknown {
    let res: unknown
    if (this.config.combine) {
      let c = this.config.combine(ctx as ContextType<R>, children as Array<T>)
      res = c ?? ctx
    } else {
      res = ctx
    }
    return res
  }
}
