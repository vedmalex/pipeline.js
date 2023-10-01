import { empty_run, makeCallback, makeCallbackArgs, run_or_execute, Stage, StageRun } from '../../stage'
import { ParallelConfig } from './ParallelConfig'
import { ParallelError } from './ParallelError'

/**
 * Process staging in parallel way
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

export class Parallel<
  Input,
  Output,
  T,
  Config extends ParallelConfig<Input, Output, T> = ParallelConfig<Input, Output, T>,
> extends Stage<Input, Output, Config> {
  public override get name(): string {
    return this._config.name ?? this._config.stage?.name ?? ''
  }

  override compile(rebuild: boolean = false): StageRun<Input, Output> {
    if (this.config.stage) {
      var run: StageRun<Input, Output> = (err, ctx, done) => {
        var children = this.split(ctx)
        var len = children.length
        let errors: Array<Error>
        let hasError = false
        const build = (i: number) => {
          return new Promise(resolve => {
            run_or_execute(
              this.config.stage,
              err,
              children[i],
              makeCallback((err, res) => {
                if (err) {
                  if (!hasError) {
                    hasError = true
                    errors = []
                  }
                  const error = new ParallelError({
                    stage: this.name,
                    index: i,
                    err: err,
                    ctx: children[i],
                  })
                  if (error) {
                    errors.push(error)
                  }
                }
                resolve([err, res] as [unknown, T])
              }),
            )
          })
        }

        if (len === 0) {
          return done(makeCallbackArgs(err, ctx as unknown as Output))
        } else {
          let result: Array<Promise<[unknown, T]>> = []
          for (let i = 0; i < children.length; i++) {
            result.push(build(i) as Promise<[unknown, T]>)
          }

          Promise.allSettled(result).then(res => {
            const mapRes: Array<T> = []
            res.forEach(r => {
              if (r.status === 'fulfilled') {
                mapRes.push(r.value[1])
              } else {
                errors.push(r.reason)
              }
            })
            let result = this.combine(ctx, mapRes)
            done(makeCallbackArgs(errors, result))
          })
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
