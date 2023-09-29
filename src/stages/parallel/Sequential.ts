import { AllowedStage, empty_run, makeCallbackArgs, run_or_execute_async, Stage, StageRun } from '../../stage'
import { getParallelConfig } from './getParallelConfig'
import { ParallelConfig } from './ParallelConfig'

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
  Input,
  Output,
  T,
  Config extends ParallelConfig<Input, Output, T> = ParallelConfig<Input, Output, T>,
> extends Stage<Input, Output, Config> {
  constructor(config?: AllowedStage<Input, Output, Config>) {
    super()
    if (config) {
      this._config = getParallelConfig<Input, Output, T, Config>(config)
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

  override compile(rebuild: boolean = false): StageRun<Input, Output> {
    if (this.config.stage) {
      var run: StageRun<Input, Output> = (err, ctx, done) => {
        var iter = -1
        var children = this.split ? this.split(ctx) : [ctx as unknown as T]
        var len = children ? children.length : 0

        const next = async (err: unknown) => {
          if (err) {
            return done(makeCallbackArgs(err))
          }
          let retCtx: T
          while (++iter < len) {
            ;[err, retCtx] = await run_or_execute_async(this.config.stage, err, children[iter])
            if (err) {
              // TODO: refactor it
              // для всех сложных параметров должен быть свой собственный rescue, а не один на всех
              ;[err, retCtx] = await this.rescue_async(err, children[iter] as unknown as Output) as unknown as [
                unknown,
                T,
              ]
              if (err) {
                return done(makeCallbackArgs(err))
              }
            }
            if (retCtx) {
              children[iter] = retCtx
            }
          }

          let result = this.combine(ctx, children)
          return done(makeCallbackArgs(undefined, result))
        }

        if (len === 0) {
          return done(makeCallbackArgs(err, ctx as unknown as Output))
        } else {
          next(err)
        }
      }

      this.run = run as StageRun<Input, Output>
    } else {
      this.run = empty_run
    }

    return super.compile(rebuild)
  }
  protected split(ctx: Input): Array<T> {
    return this._config.split
      ? this._config.split(ctx) ?? [ctx as unknown as T]
      : [ctx as unknown as T]
  }

  protected combine(ctx: Input, children: Array<T>): Output {
    let res: Output
    if (this.config.combine) {
      let c = this.config.combine(ctx, children)
      res = c ?? ctx as unknown as Output
    } else {
      res = ctx as unknown as Output
    }
    return res
  }
}
