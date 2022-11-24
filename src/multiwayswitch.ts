import { Stage } from './stage'
import { CreateError } from './utils/ErrorList'
import { run_or_execute } from './utils/run_or_execute'
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

export type MultiWaySwitchCase<T extends StageObject> =
  | MultiWaySwitchStatic<T>
  | MultiWaySwitchDynamic<T>

export interface MultiWaySwitchStatic<T extends StageObject> {
  stage: AnyStage<T> | RunPipelineFunction<T>
  evaluate?: boolean
  split?: Func1Sync<any, Possible<T>>
  combine?: Func2Sync<Possible<T>, Possible<T>, any>
}

export interface MultiWaySwitchDynamic<T extends StageObject> {
  stage: AnyStage<T> | RunPipelineFunction<T>
  evaluate: Func1<boolean, T>
  split?: Func1Sync<any, Possible<T>>
  combine?: Func2Sync<Possible<T>, Possible<T>, any>
}

export function isMultiWaySwitch<T extends StageObject>(
  inp: object,
): inp is MultiWaySwitchCase<T> {
  return (
    typeof inp == 'object' &&
    inp != null &&
    'stage' in inp &&
    isRunPipelineFunction((inp as { stage: any })['stage'])
  )
}

export interface MultWaySwitchConfig<T extends StageObject>
  extends StageConfig<T> {
  cases: Array<MultiWaySwitchCase<T>>
  split?: Func1Sync<any, Possible<T>>
  combine?: Func2Sync<Possible<T>, Possible<T>, any>
}

export type AllowedMWS<T extends StageObject, C extends StageConfig<T>> =
  | AllowedStage<T, C>
  | Array<Stage<T, C> | RunPipelineFunction<T> | MultiWaySwitchCase<T>>

export function getMultWaySwitchConfig<T extends StageObject>(
  config: AllowedMWS<T, Partial<MultWaySwitchConfig<T>>>,
): MultWaySwitchConfig<T> {
  if (Array.isArray(config)) {
    return {
      cases: config.map(item => {
        let res: MultiWaySwitchCase<T>
        if (isRunPipelineFunction(item)) {
          res = { stage: item, evaluate: true }
        } else if (item instanceof Stage) {
          res = { stage: item, evaluate: true }
        } else if (isMultiWaySwitch<T>(item)) {
          res = item
        } else {
          throw CreateError('not suitable type for array in pipelin')
        }
        return res
      }),
    }
  } else {
    const res = getStageConfig(config)
    if (res instanceof Stage) {
      return { cases: [{ stage: res, evaluate: true }] }
    } else if (typeof config == 'object' && !(config instanceof Stage)) {
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
    return res as MultWaySwitchConfig<T>
  }
}

export class MultiWaySwitch<T extends StageObject> extends Stage<
  T,
  MultWaySwitchConfig<T>
> {
  constructor(config?: AllowedStage<T, MultWaySwitchConfig<T>>) {
    super()
    if (config) {
      this._config = getMultWaySwitchConfig<T>(config)
    }
  }

  public override get reportName() {
    return `Templ:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline MultWaySwitch]'
  }

  combine(ctx: Possible<T>, retCtx: any): Possible<T> {
    if (this.config.combine) {
      return this.config.combine(ctx, retCtx)
    } else {
      return ctx as Possible<T>
    }
  }

  combineCase(
    item: MultiWaySwitchCase<T>,
    ctx: Possible<T>,
    retCtx: any,
  ): Possible<T> {
    if (item.combine) {
      return item.combine(ctx, retCtx)
    } else {
      return this.combine(ctx, retCtx)
    }
  }

  split(ctx: Possible<T>): any {
    if (this.config.split) {
      return this.config.split(ctx)
    } else {
      return ctx
    }
  }

  splitCase(
    item: { split?: Func1Sync<any, Possible<T>> },
    ctx: Possible<T>,
  ): any {
    if (item.split) {
      return item.split(ctx)
    } else {
      return this.split(ctx)
    }
  }

  override compile(rebuild: boolean = false): StageRun<T> {
    let i
    let statics: Array<MultiWaySwitchStatic<T>> = []
    let dynamics: Array<MultiWaySwitchDynamic<T>> = []

    // Apply to each stage own environment: evaluate, split, combine
    for (i = 0; i < this.config?.cases?.length; i++) {
      let caseItem: MultiWaySwitchCase<T>
      caseItem = this.config.cases[i]

      if (caseItem instanceof Function) {
        caseItem = {
          stage: new Stage(caseItem),
          evaluate: true,
        } as MultiWaySwitchStatic<T>
      }

      if (caseItem instanceof Stage) {
        caseItem = {
          stage: caseItem,
          evaluate: true,
        }
      }

      if (caseItem.stage) {
        if (caseItem.stage instanceof Function) {
          caseItem.stage = caseItem.stage
        }
        if (
          !(caseItem.stage instanceof Stage) &&
          typeof caseItem.stage == 'object'
        ) {
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
          dynamics.push(caseItem as MultiWaySwitchDynamic<T>)
        } else if (
          typeof caseItem.evaluate === 'boolean' &&
          caseItem.evaluate
        ) {
          statics.push(caseItem as MultiWaySwitchStatic<T>)
        }
      }
    }

    let run: StageRun<T> = (
      err: Possible<Error>,
      ctx: T,
      done: CallbackFunction<T>,
    ) => {
      let actuals: Array<MultiWaySwitchCase<T>> = []
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
        return (err: Possible<Error>, retCtx: Possible<T>) => {
          iter++
          let cur = actuals[index]
          let res: Possible<T> = undefined
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
