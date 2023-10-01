import { empty_run, makeCallbackArgs, run_or_execute_async, Stage, StageRun } from '../../stage'
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
    if (this._config.split) {
      let res = this._config.split(ctx)
      if (!res) throw new Error('split MUST return value')
      if (!Array.isArray(res)) throw new Error('split MUST return Array')
      return res
    }
    return [ctx as unknown as T]
  }

  protected combine(ctx: Input, children: Array<T>): Output {
    let res: Output
    if (this.config.combine) {
      res = this.config.combine(ctx, children)
      if(!res) throw new Error('combine MUST return value')
    } else {
      res = ctx as unknown as Output
    }
    return res
  }
}
