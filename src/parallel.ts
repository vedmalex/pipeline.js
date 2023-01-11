import { Stage } from './stage'
import { empty_run } from './utils/empty_run'
import { ComplexError, CreateError } from './utils/ErrorList'
import { run_or_execute } from './utils/run_or_execute'
import { ContextType } from './context'
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
export class Parallel<
  T extends StageObject,
  R extends StageObject,
> extends Stage<T, ParallelConfig<T, R>> {
  constructor(config?: AllowedStage<T, R, ParallelConfig<T, R>>) {
    super()
    if (config) {
      this._config = getParallelConfig<T, R>(config)
    }
  }

  split(ctx: ContextType<T>): Array<ContextType<R>> {
    return this._config.split ? this._config.split(ctx) : [ctx]
  }

  combine(
    ctx: ContextType<T>,
    children: Array<ContextType<R>>,
  ): ContextType<T> {
    let res: ContextType<T>
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
        err: Possible<ComplexError>,
        ctx: ContextType<T>,
        done: CallbackFunction<T>,
      ) => {
        var iter = 0
        var children = this.split(ctx)
        var len = children ? children.length : 0
        let errors: Array<Error>
        let hasError = false

        var next = (index: number) => {
          return (err: Possible<ComplexError>, retCtx: any) => {
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
            run_or_execute(
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

export type ParallelErrorInput = {
  stage?: string
  index: number
  err: Error
  ctx: any
}

export class ParallelError<T> extends Error {
  override name: string
  stage?: string
  index: number
  err: Error
  ctx: T
  constructor(init: ParallelErrorInput) {
    super(init.err.message)
    this.name = 'ParallerStageError'
    this.stage = init.stage
    this.ctx = init.ctx
    this.err = init.err
    this.index = init.index
  }
  override toString() {
    return `${this.name}: at stage ${this.stage} error occured:
    iteration ${this.index}
    ${this.err.message}
    stack is: ${this.err.stack}`
  }
}
