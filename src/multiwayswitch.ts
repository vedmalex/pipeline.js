import { Stage } from './stage'
import { ComplexError, CreateError } from './utils/ErrorList'
import { run_or_execute } from './utils/run_or_execute'
import { ContextType } from './context'
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
  split?: Func1Sync<ContextType<R>, ContextType<I>>
  combine?: Func2Sync<ContextType<I>, ContextType<R>, any>
}

export interface MultiWaySwitchDynamic<
  T extends StageObject,
  R extends StageObject,
> {
  stage: AnyStage<R, R> | RunPipelineFunction<R>
  evaluate: Func1<boolean, R>
  split?: Func1Sync<ContextType<T>, ContextType<R>>
  combine?: Func2Sync<ContextType<R>, ContextType<R>, any>
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
  split?: Func1Sync<ContextType<R>, ContextType<StageObject>>
  combine?: Func2Sync<ContextType<T>, Possible<T>, any>
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
          throw CreateError('not suitable type for array in pipelin')
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
        throw CreateError(" don't use run and stage both ")
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

  combine(ctx: ContextType<T>, retCtx: ContextType<R>): ContextType<T> {
    if (this.config.combine) {
      return this.config.combine(ctx, retCtx)
    } else {
      return ctx
    }
  }

  combineCase(
    item: MultiWaySwitchCase<R, StageObject>,
    ctx: ContextType<R>,
    retCtx: ContextType<StageObject>,
  ): ContextType<T> {
    if (item.combine) {
      return item.combine(ctx, retCtx)
    } else {
      return this.combine(ctx, retCtx)
    }
  }

  split(ctx: ContextType<T>): ContextType<R> {
    if (this.config.split) {
      return this.config.split(ctx)
    } else {
      return ctx
    }
  }

  splitCase(
    item: { split?: Func1Sync<any, ContextType<T>> },
    ctx: ContextType<R>,
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

      if (caseItem instanceof Function) {
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
        if (caseItem.stage instanceof Function) {
          caseItem.stage = caseItem.stage
        }
        if (!isAnyStage<R, StageObject> && typeof caseItem.stage == 'object') {
          caseItem.stage = new Stage(caseItem.stage)
        }

        if (!(caseItem.split instanceof Function)) {
          caseItem.split = this.config.split
        }
        if (!(caseItem.combine instanceof Function)) {
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

    let run: StageRun<T> = (
      err: Possible<ComplexError>,
      ctx: ContextType<T>,
      done: CallbackFunction<T>,
    ) => {
      let actuals: Array<MultiWaySwitchCase<R, StageObject>> = []
      actuals.push.apply(actuals, statics)

      for (let i = 0; i < dynamics.length; i++) {
        if (dynamics[i].evaluate(ctx as T)) {
          actuals.push(dynamics[i])
        }
      }

      let iter = 0

      let errors: Array<Error> = []
      let hasError = false

      let next = (index: number) => {
        return (err: Possible<ComplexError>, retCtx: ContextType<R>) => {
          iter++
          let cur = actuals[index]
          let res: Possible<ContextType<T>> = null
          if (err) {
            if (!hasError) hasError = true
            errors.push(err)
          } else {
            res = this.combineCase(cur, ctx, retCtx)
          }

          if (iter >= actuals.length) {
            return done(hasError ? CreateError(errors) : undefined, res ?? ctx)
          }
        }
      }
      let stg
      let lctx
      for (i = 0; i < actuals.length; i++) {
        stg = actuals[i]
        lctx = this.splitCase(stg, ctx)

        run_or_execute<T>(stg.stage, err, lctx, next(i) as CallbackFunction<T>)
        // не хватает явной передачи контекста
      }

      if (actuals.length === 0) {
        return done(err)
      }
    }

    this.run = run

    return super.compile(rebuild)
  }
}
