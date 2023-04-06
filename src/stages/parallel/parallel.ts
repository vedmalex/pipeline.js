import {
  AllowedStage,
  ContextType,
  CreateError,
  Stage,
  StageObject,
  StageRun,
  empty_run,
  run_or_execute,
} from '../../stage'
import { ParallelConfig } from './ParallelConfig'
import { getParallelConfig } from './getParallelConfig'
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
        var children = this.split(ctx)
        var len = children ? children.length : 0
        let errors: Array<Error>
        let hasError = false
        const build = (i: number) => {
          return new Promise(resolve => {
            run_or_execute(this.config.stage, err, children[i], (err, res) => {
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
                if (error) errors.push(error)
              }
              resolve([err, res] as [unknown, ContextType<T>])
            })
          })
        }

        if (len === 0) {
          return done(err, ctx)
        } else {
          let result: Array<Promise<[unknown, ContextType<T>]>> = []
          for (let i = 0; i < children.length; i++) {
            result.push(build(i) as Promise<[unknown, ContextType<T>]>)
          }
          Promise.all(result).then(res => {
            let result = this.combine(
              ctx,
              res.map(r => r[1]),
            )
            done(CreateError(errors), result)
          })
        }
      }
      this.run = run as StageRun<R>
    } else {
      this.run = empty_run
    }

    return super.compile(rebuild)
  }

  protected split(ctx: ContextType<R>): Array<ContextType<T>> {
    return this._config.split ? this._config.split(ctx) ?? [ctx] : [ctx as unknown as ContextType<T>]
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
