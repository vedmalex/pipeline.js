import { AllowedStage, ContextType, Stage, StageObject, StageRun, empty_run, run_or_execute_async } from '../../stage'
import { ParallelConfig } from './ParallelConfig'
import { getParallelConfig } from './getParallelConfig'

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

export class Sequential<
  R extends StageObject,
  T extends StageObject,
  C extends ParallelConfig<R, T> = ParallelConfig<R, T>,
> extends Stage<R, C> {
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
        var children = this.split ? this.split(ctx) : [ctx as unknown as ContextType<T>]
        var len = children ? children.length : 0

        const next = async (err: unknown) => {
          if (err) {
            return done(err)
          }
          let retCtx: ContextType<T>
          while (++iter < len) {
            ;[err, retCtx] = await run_or_execute_async(this.config.stage, err, children[iter])
            if (err) {
              ;[err, retCtx] = await this.rescue_async(err, children[iter])
              if (err) {
                return done(err)
              }
            }
            if (retCtx) {
              children[iter] = retCtx
            }
          }

          let result = this.combine(ctx, children)
          return done(undefined, result)
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

    return super.compile(rebuild)
  }
  protected split(ctx: ContextType<R>): Array<ContextType<T>> {
    return this._config.split
      ? this._config.split(ctx) ?? [ctx as unknown as ContextType<T>]
      : [ctx as unknown as ContextType<T>]
  }

  protected combine(ctx: ContextType<R>, children: Array<ContextType<T>>): ContextType<R> {
    let res: ContextType<R>
    if (this.config.combine) {
      let c = this.config.combine(ctx, children)
      res = c ?? ctx
    } else {
      res = ctx
    }
    return res
  }
}
