import { Stage } from './stage'
import { empty_run } from './utils/empty_run'
import { CleanError } from './utils/ErrorList'
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
  T extends StageObject,
  R extends StageObject,
> extends Stage<T, ParallelConfig<T, R>> {
  constructor(config?: AllowedStage<T, R, ParallelConfig<T, R>>) {
    super()
    if (config) {
      this._config = getParallelConfig(config)
    }
  }

  split(ctx: T): Array<R> {
    return this._config.split ? this._config.split(ctx) : [ctx]
  }

  combine(
    ctx: T,
    children: Array<R>,
  ): T {
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
      const run: StageRun<T> = async (
        initialErr: Possible<CleanError>,
        initialCtx: T,
        done: CallbackFunction<T>,
      ) => {
        try {
          let iter = -1;
          const children = this.split
            ? this.split(initialCtx)
            : [initialCtx as unknown as R];
          const len = children.length;

          if (len === 0) {
            return done(initialErr, initialCtx);
          }

          let currentError: Possible<CleanError> = initialErr;
          let currentChildren: Array<R | undefined> = [];
          currentChildren.length = len
          currentChildren.fill(undefined)

          while (++iter < len) {
            if (currentError) break;

            const { resolve, reject, promise } = Promise.withResolvers<T>()
            run_or_execute(
              this.config.stage,
              currentError,
              children[iter],
              (err, ctx) => {
                if (err) {
                  reject(err);
                } else if (ctx) {
                  resolve(ctx)
                }
              }
            );

            currentChildren[iter] = await promise.catch(err => {
              throw new Error('sequential - error', {
                cause: {
                  err,
                  iteration: iter,
                  stage: this.config.stage,
                  ctx: children[iter]
                },
              })
            })
          }

          if (currentError) {
            done(currentError);
          } else {
            const result = this.combine(initialCtx, currentChildren as Array<R>);
            done(undefined, result);
          }
        } catch (err) {
          done(err as CleanError);
        }
      };

      this.run = run
    } else {
      this.run = empty_run
    }

    return super.compile()
  }
}
