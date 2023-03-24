import { Stage } from './stage'
import { empty_run } from './utils/empty_run'
import { CreateError } from './utils/ErrorList'
import { run_or_execute } from './utils/run_or_execute'
import { AllowedStage, CallbackFunction, getParallelConfig, ParallelConfig, StageRun } from './utils/types/types'

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
export class Parallel<R, C extends ParallelConfig<R>> extends Stage<R, C> {
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
      var run: StageRun<R> = (err: unknown, ctx, done: CallbackFunction<R>) => {
        var iter = 0
        var children = this.split(ctx)
        var len = children ? children.length : 0
        let errors: Array<Error>
        let hasError = false

        var next = (index: number) => {
          return (err: unknown, retCtx: any) => {
            if (!err) {
              children[index] = retCtx ?? children[index]
            } else {
              if (!hasError) {
                hasError = true
                errors = []
              }
              const error = new ParallelError({
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
                return done(undefined, result as R)
              } else {
                return done(CreateError(errors), ctx as R)
              }
            }
          }
        }

        if (len === 0) {
          return done(err, ctx as R)
        } else {
          for (var i = 0; i < len; i++) {
            run_or_execute(this.config.stage, err, children[i], next(i) as CallbackFunction<R>)
          }
        }
      }
      this.run = run as StageRun<R>
    } else {
      this.run = empty_run
    }

    return super.compile(rebuild)
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

export type ParallelErrorInput = {
  stage?: string
  index: number
  err: unknown
  ctx: unknown
}

export class ParallelError extends Error {
  override name: string
  stage?: string
  index: number
  err: unknown
  ctx: unknown
  constructor(init: ParallelErrorInput) {
    super()
    this.name = 'ParallerStageError'
    this.stage = init.stage
    this.ctx = init.ctx
    this.err = init.err
    this.index = init.index
  }
  override toString() {
    return `${this.name}: at stage ${this.stage} error occured:
    iteration ${this.index}
    ${this.err}`
  }
}
