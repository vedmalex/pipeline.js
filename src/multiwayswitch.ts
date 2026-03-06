import { Stage } from './stage'
import { isFunction } from './utils/TypeDetectors'
import { CleanError, createError } from './utils/ErrorList'
import { run_or_execute } from './utils/run_or_execute'
import { isAnyStage } from './utils/types'
import {
  AllowedStage,
  AnyStage,
  Func1,
  Func1Sync,
  Func2Sync,
  getStageConfig,
  isRunPipelineFunction,
  RunPipelineFunction,
  StageObject,
} from './utils/types'
import {
  CallbackFunction,
  Possible,
  StageConfig,
  StageRun,
} from './utils/types'

export type MultiWaySwitchCase<R extends StageObject, I extends StageObject> =
  | MultiWaySwitchStatic<R, I>
  | MultiWaySwitchDynamic<R, I>

export interface MultiWaySwitchStatic<
  R extends StageObject,
  I extends StageObject,
> {
  stage: AnyStage<I, I> | RunPipelineFunction<I>
  evaluate?: boolean
  split?: Func1Sync<R, I>
  combine?: Func2Sync<I, R, any>
}

export interface MultiWaySwitchDynamic<
  T extends StageObject,
  R extends StageObject,
> {
  stage: AnyStage<R, R> | RunPipelineFunction<R>
  evaluate: Func1<boolean, R>
  split?: Func1Sync<T, R>
  combine?: Func2Sync<R, R, any>
}

export function isMultiWaySwitch<T extends StageObject, R extends StageObject>(
  inp: object,
): inp is MultiWaySwitchCase<T, R> {
  return (
    typeof inp == 'object' &&
    inp != null &&
    'stage' in inp &&
    isRunPipelineFunction((inp as { stage: any })['stage'])
  )
}

//пересмотреть!!!!
export interface MultWaySwitchConfig<
  T extends StageObject,
  R extends StageObject,
> extends StageConfig<T> {
  cases: Array<MultiWaySwitchCase<R, StageObject>>
  split?: Func1Sync<R, StageObject>
  combine?: Func2Sync<T, Possible<T>, any>
}

export type AllowedMWS<
  T extends StageObject,
  R extends StageObject,
  C extends StageConfig<T>,
> =
  | AllowedStage<T, R, C>
  | Array<Stage<T, C> | RunPipelineFunction<T> | MultiWaySwitchCase<T, R>>

export function getMultWaySwitchConfig<
  T extends StageObject,
  R extends StageObject,
>(
  config: AllowedMWS<T, R, Partial<MultWaySwitchConfig<T, R>>>,
): MultWaySwitchConfig<T, R> {
  if (Array.isArray(config)) {
    return {
      cases: config.map(item => {
        let res: MultiWaySwitchCase<R, StageObject>
        if (isRunPipelineFunction(item)) {
          res = { stage: item, evaluate: true }
        } else if (isAnyStage<T, R>(item)) {
          res = {
            stage: item as unknown as AnyStage<R, StageObject>,
            evaluate: true,
          }
        } else if (isMultiWaySwitch<R, StageObject>(item)) {
          res = item
        } else {
          throw createError('not suitable type for array in pipelin')
        }
        return res
      }),
    }
  } else {
    const res = getStageConfig(config)
    if (isAnyStage<T, R>(res)) {
      return { cases: [{ stage: res, evaluate: true }] }
    } else if (typeof config == 'object' && !isAnyStage<T, R>(config)) {
      if (config?.run && config.cases && config.cases.length > 0) {
        throw createError(" don't use run and stage both ")
      }
      if (config.run) {
        res.cases = [{ stage: config.run, evaluate: true }]
      }
      if (config.cases) {
        res.cases = config.cases
      }
      if (config.split) {
        res.split = config.split
      }
      if (config.combine) {
        res.combine = config.combine
      }
    } else if (typeof config == 'function' && res.run) {
      res.cases = [{ stage: res.run, evaluate: true }]
      delete res.run
    }
    if (typeof res.cases == 'undefined') res.cases = []
    return res as MultWaySwitchConfig<T, R>
  }
}

export class MultiWaySwitch<
  T extends StageObject,
  R extends StageObject,
> extends Stage<T, MultWaySwitchConfig<T, R>> {
  constructor(config?: AllowedStage<T, R, MultWaySwitchConfig<T, R>>) {
    super()
    if (config) {
      this._config = getMultWaySwitchConfig<T, R>(config)
    }
  }

  public override get reportName() {
    return `Templ:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline MultWaySwitch]'
  }

  combine(ctx: T, retCtx: R): T {
    if (this.config.combine) {
      return this.config.combine(ctx, retCtx)
    } else {
      return ctx
    }
  }

  combineCase(
    item: MultiWaySwitchCase<R, StageObject>,
    ctx: R,
    retCtx: StageObject,
  ): T {
    if (item.combine) {
      return item.combine(ctx, retCtx)
    } else {
      return this.combine(ctx, retCtx)
    }
  }

  split(ctx: T): R {
    if (this.config.split) {
      return this.config.split(ctx)
    } else {
      return ctx
    }
  }

  splitCase(
    item: { split?: Func1Sync<any, T> },
    ctx: R,
  ): any {
    if (item.split) {
      return item.split(ctx)
    } else {
      return this.split(ctx)
    }
  }

  override compile(rebuild: boolean = false): StageRun<T> {
    let i
    let statics: Array<MultiWaySwitchStatic<R, StageObject>> = []
    let dynamics: Array<MultiWaySwitchDynamic<R, StageObject>> = []

    // Apply to each stage own environment: evaluate, split, combine
    for (i = 0; i < this.config?.cases?.length; i++) {
      let caseItem: MultiWaySwitchCase<R, StageObject>
      caseItem = this.config.cases[i]

      if (isFunction(caseItem)) {
        caseItem = {
          stage: new Stage(caseItem),
          evaluate: true,
        } as MultiWaySwitchStatic<R, StageObject>
      }

      if (isAnyStage<R, StageObject>(caseItem)) {
        caseItem = {
          stage: caseItem,
          evaluate: true,
        }
      }

      if (caseItem.stage) {
        if (isFunction(caseItem.stage)) {
          caseItem.stage = caseItem.stage
        }
        if (
          !isAnyStage<R, StageObject>(caseItem.stage) &&
          typeof caseItem.stage == 'object'
        ) {
          caseItem.stage = new Stage(caseItem.stage)
        }

        if (!isFunction(caseItem.split)) {
          caseItem.split = this.config.split
        }
        if (!isFunction(caseItem.combine)) {
          caseItem.combine = this.config.combine
        }

        if (!('evaluate' in caseItem)) {
          // by default is evaluate
          caseItem.evaluate = true
        }
        if (typeof caseItem.evaluate === 'function') {
          caseItem.evaluate
          dynamics.push(caseItem as MultiWaySwitchDynamic<R, StageObject>)
        } else if (
          typeof caseItem.evaluate === 'boolean' &&
          caseItem.evaluate
        ) {
          statics.push(caseItem as MultiWaySwitchStatic<R, StageObject>)
        }
      }
    }

    let run: StageRun<T> = async (
      initialErr: Possible<CleanError>,
      initialCtx: T,
      done: CallbackFunction<T>,
    ) => {
      // Собираем все актуальные задачи
      const actuals: Array<MultiWaySwitchCase<R, StageObject>> = [];
      actuals.push(...statics);

      for (let i = 0; i < dynamics.length; i++) {
        if (dynamics[i].evaluate(initialCtx as T)) {
          actuals.push(dynamics[i]);
        }
      }

      // Если задач нет, завершаем сразу
      if (actuals.length === 0) {
        return done(initialErr, initialCtx);
      }

      let resultContext: Possible<T> = null;

      try {
        // Создаем массив промисов для выполнения задач

        const promises: Array<Promise<void>> = []

        for (let i = 0; i < actuals.length; i++) {
          const stg = actuals[i]
          const { promise, resolve, reject } = Promise.withResolvers<void>()
          const lctx = this.splitCase(stg, initialCtx);
          run_or_execute<T>(
            stg.stage,
            initialErr,
            lctx,
            (err, retCtx) => {
              if (err) {
                reject(new Error('mws - error', {
                  cause: {
                    err,
                    ctx: lctx,
                    actuals,
                    index: i,
                  }
                }))
              } else {
                // TODO: ?? контекст может быть сильно изменен !!
                resultContext = this.combineCase(stg, initialCtx, retCtx as any);
                resolve();
              }
            }
          );
          promises.push(promise)
        }

        // Ожидаем завершения всех промисов
        const result = await Promise.allSettled(promises);
        let errors = result.filter((value): value is PromiseRejectedResult => value.status === 'rejected')
          .map(v => v.reason)

        // Проверяем, были ли ошибки
        if (errors.length > 0) {
          done(createError(errors), initialCtx);
        } else {
          done(undefined, resultContext ?? initialCtx);
        }
      } catch (err) {
        // Обработка неожиданных ошибок
        done(err as CleanError, initialCtx);
      }
    };

    this.run = run

    return super.compile(rebuild)
  }
}
