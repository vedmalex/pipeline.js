import { Stage } from './stage'
import { empty_run } from './utils/empty_run'
import { CreateError } from './utils/ErrorList'
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
export class Parallel<T extends StageObject> extends Stage<
  T,
  ParallelConfig<T>
> {
  constructor(config?: AllowedStage<T, ParallelConfig<T>>) {
    super()
    if (config) {
      this._config = getParallelConfig<T>(config)
    }
  }

  split(ctx: Possible<T>): Array<any> {
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
      var run: StageRun<T> = (
        err: Possible<Error>,
        ctx: T,
        done: CallbackFunction<T>,
      ) => {
        var iter = 0
        var children = this.split(ctx)
        var len = children ? children.length : 0
        let errors: Array<Error>
        let hasError = false

        var next = (index: number) => {
          return (err: Possible<Error>, retCtx: any) => {
            if (!err) {
              children[index] = retCtx ?? children[index]
            } else {
              if (!hasError) {
                hasError = true
                errors = []
              }
              const error = CreateError({
                message: `Parallel stage Error ${err.message}`,
                stage: this.name,
                index: index,
                err: err,
                ctx: children[index],
              })
              if (error) errors.push(error)
            }

            iter += 1
            if (iter >= len) {
              if (!hasError) {
                let result = this.combine(ctx, children)
                return done(undefined, result)
              } else {
                return done(CreateError(errors), ctx)
              }
            }
          }
        }

        if (len === 0) {
          return done(err, ctx)
        } else {
          for (var i = 0; i < len; i++) {
            run_or_execute<T>(
              this.config.stage,
              err,
              children[i],
              next(i) as CallbackFunction<T>,
            )
          }
        }
      }
      this.run = run
    } else {
      this.run = empty_run
    }

    return super.compile()
  }
}

export type ParallelError = {
  name: string
  stage: string
  index: number
  err: Error
  ctx: any
}
