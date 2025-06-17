import { Stage } from './stage'
import { empty_run } from './utils/empty_run'
import { CleanError, createError } from './utils/ErrorList'
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
        const children = this.split(initialCtx);
        const len = children ? children.length : 0;

        if (len === 0) {
          return done(initialErr, initialCtx);
        }

        try {
          // Создаем массив промисов для параллельного выполнения
          const promises: Array<Promise<{ index: number, ctx: R }>> = []
          for (let i = 0; i < children.length; i++) {
            const child = children[i]
            const { promise, reject, resolve } = Promise.withResolvers<{ index: number, ctx: R }>()

            run_or_execute(
              this.config.stage,
              initialErr,
              child,
              (err, retCtx) => {
                if (err) {
                  reject(new Error('parallel - error', {
                    cause: {
                      stage: this.name,
                      index: i,
                      err: err,
                      ctx: child,
                    }
                  }))
                } else {
                  resolve({ index: i, ctx: retCtx ?? child });
                }
              }
            );
            promises.push(promise)
          }

          // Ожидаем завершения всех промисов
          const result = await Promise.allSettled(promises);
          let errors = result.filter((value) => value.status === 'rejected')
            .map(v => v.reason)

          // Проверяем, были ли ошибки
          if (errors.length > 0) {
            done(createError(errors), initialCtx);
          } else {
            const result = this.combine(initialCtx, children);
            done(undefined, result);
          }
        } catch (err) {
          // Обработка неожиданных ошибок
          done(err as CleanError, initialCtx);
        }
      };
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
