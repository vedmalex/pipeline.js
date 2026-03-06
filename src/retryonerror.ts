import { Context } from './context'
import { Stage } from './stage'
import { isFunction } from './utils/TypeDetectors'
import { CleanError, createError } from './utils/ErrorList'
import { run_or_execute } from './utils/run_or_execute'
import {
  AllowedStage,
  AnyStage,
  getStageConfig,
  Possible,
  RunPipelineFunction,
  StageObject,
} from './utils/types'
import {
  CallbackFunction,
  Func3,
  StageConfig,
  StageRun,
  isAnyStage,
} from './utils/types'

export interface RetryOnErrorConfig<T extends StageObject>
  extends StageConfig<T> {
  stage: AnyStage<T> | RunPipelineFunction<T>
  retry: number | Func3<boolean, Possible<CleanError>, T, number>
  backup?: (ctx: T) => T
  restore?: (ctx: T, backup: T) => T
}

export function getRetryOnErrorConfig<
  T extends StageObject,
  C extends RetryOnErrorConfig<T>,
>(config: AllowedStage<T, T, C>): C {
  const res = getStageConfig<T, T, C>(config)
  if (isAnyStage<T, C>(res)) {
    return { stage: res } as C
  } else if (typeof config == 'object' && !isAnyStage<T, C>(config)) {
    if (config.run && config.stage) {
      throw createError("don't use run and stage both")
    }
    if (config.run) {
      res.stage = config.run
    }
    if (config.stage) {
      res.stage = config.stage
    }
    if (config.backup) {
      res.backup = config.backup
    }
    if (config.restore) {
      res.restore = config.restore
    }
    if (config.retry) {
      if (typeof config.retry !== 'function') {
        config.retry *= 1 // To get NaN is wrong type
      }
      res.retry = config.retry
    }
    if (!res.retry) res.retry = 1
  } else if (typeof config == 'function' && res.run) {
    res.stage = res.run
    delete res.run
  }
  return res
}

export class RetryOnError<T extends StageObject> extends Stage<
  T,
  RetryOnErrorConfig<T>
> {
  constructor(config?: AllowedStage<T, T, RetryOnErrorConfig<T>>) {
    super()
    if (config) {
      this._config = getRetryOnErrorConfig<T, RetryOnErrorConfig<T>>(config)
    }
  }

  public override get reportName() {
    return `Templ:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline RetryOnError]'
  }

  backupContext(ctx: T): T {
    if (this.config.backup) {
      return this.config.backup(ctx)
    } else {
      if (Context.isContext(ctx)) {
        return ctx.fork({})
      } else {
        return ctx
      }
    }
  }

  restoreContext(ctx: T, backup: T): T {
    if (this.config.restore) {
      const res = this.config.restore(ctx, backup)
      return res ?? ctx
    } else {
      if (Context.isContext(ctx)) {
        for (let key in backup) {
          ; (ctx as any)[key] = backup[key]
        }
        return ctx
      } else {
        return backup
      }
    }
  }

  override compile(rebuild: boolean = false): StageRun<T> {
    let run: StageRun<T> = async (
      initialErr: Possible<CleanError>,
      initialCtx: T,
      done: CallbackFunction<T>,
    ) => {
      let currentError: Possible<CleanError> = initialErr;
      let currentCtx = initialCtx;
      let iter = -1;
      const backup = this.backupContext(initialCtx);
      try {
        // Создаем резервную копию контекста

        // Функция для проверки завершения
        const reachEnd = (err: Possible<CleanError>, iteration: number): boolean => {
          if (err) {
            if (isFunction(this.config.retry)) {
              return !this.config.retry(err, currentCtx, iteration);
            } else {
              // Если retry — число, проверяем количество попыток
              return iteration > this.config.retry;
            }
          }
          return true; // Если ошибки нет, завершаем
        };

        // Основной цикл
        do {
          iter++;

          // Восстанавливаем контекст перед каждой попыткой
          if (iter > 0)
            currentCtx = this.restoreContext(currentCtx, backup);

          await new Promise<void>(resolve => {
            run_or_execute(
              this.config.stage,
              currentError,
              currentCtx,
              (err, ctx) => {
                if (err) {
                  currentError = err
                } else {
                  currentCtx = (ctx ?? currentCtx) as T
                  currentError = undefined
                }
                resolve()
              },
            );
          })


        } while (!reachEnd(currentError, iter))

        // Завершаем выполнение
        done(currentError, currentCtx);
      } catch (err) {
        // Обрабатываем неожиданные ошибки
        currentCtx = this.restoreContext(currentCtx, backup);
        done(err as CleanError, initialCtx);
      }
    };

    this.run = run

    return super.compile(rebuild)
  }
}
