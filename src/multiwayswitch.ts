import { ContextType } from './context'
import { Stage } from './stage'
import { CreateError } from './utils/ErrorList'
import { run_or_execute } from './utils/run_or_execute'
import { isAnyStage } from './utils/types/types'
import {
  AllowedStage,
  getStageConfig,
  isRunPipelineFunction,
  RunPipelineFunction,
  EvaluateFunction,
} from './utils/types/types'
import { CallbackFunction, Possible, StageConfig, StageRun, AnyStage } from './utils/types/types'

export type MultiWaySwitchCase<R, T> = MultiWaySwitchStatic<R, T> | MultiWaySwitchDynamic<R, T>

export type CombineFunction<R, T> =
  | ((ctx: ContextType<R>, children: T) => R)
  | ((ctx: ContextType<R>, children: T) => unknown)
export type SplitFunction<R, T> = ((ctx: ContextType<R>) => ContextType<T>) | ((ctx: ContextType<R>) => T)
export interface MultiWaySwitchStatic<R, T> {
  stage: AnyStage<R> | RunPipelineFunction<R>
  evaluate?: boolean
  split?: SplitFunction<R, T>
  combine?: CombineFunction<R, T>
}

export interface MultiWaySwitchDynamic<R, T> {
  stage: AnyStage<R> | RunPipelineFunction<R> | AllowedStage<R, StageConfig<R>>
  evaluate: EvaluateFunction<R>
  split?: SplitFunction<R, T>
  combine?: CombineFunction<R, T>
}

export function isMultiWaySwitch<R, T>(inp: object): inp is MultiWaySwitchCase<R, T> {
  return (
    typeof inp == 'object' && inp != null && 'stage' in inp && isRunPipelineFunction((inp as { stage: any })['stage'])
  )
}

//пересмотреть!!!!
export interface MultWaySwitchConfig<R, T> extends StageConfig<R> {
  cases: Array<MultiWaySwitchCase<R, T> | AnyStage<R>>
  split?: SplitFunction<R, T>
  combine?: CombineFunction<R, T>
}

export type AllowedMWS<R, T, C extends StageConfig<R>> =
  | AllowedStage<R, C>
  | Array<AnyStage<R> | RunPipelineFunction<R> | MultiWaySwitchCase<R, T>>

export function getMultWaySwitchConfig<R, T, C extends MultWaySwitchConfig<R, T>>(config: AllowedMWS<R, T, C>): C {
  if (Array.isArray(config)) {
    return {
      cases: config.map(item => {
        let res: MultiWaySwitchCase<R, T>
        if (isRunPipelineFunction<R>(item)) {
          res = { stage: item, evaluate: true }
        } else if (isAnyStage(item)) {
          res = {
            stage: item,
            evaluate: true,
          }
        } else if (isMultiWaySwitch<R, T>(item)) {
          res = item
        } else {
          throw CreateError(new Error('not suitable type for array in pipelin'))
        }
        return res
      }),
    } as C
  } else {
    const res = getStageConfig(config)
    if (isAnyStage(res)) {
      return { cases: [{ stage: res, evaluate: true }] } as C
    } else if (typeof config == 'object' && !isAnyStage(config)) {
      if (config?.run && config.cases && config.cases.length > 0) {
        throw CreateError(new Error(" don't use run and stage both "))
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
    return res as C
  }
}

export class MultiWaySwitch<R, T, C extends MultWaySwitchConfig<R, T> = MultWaySwitchConfig<R, T>> extends Stage<R, C> {
  constructor(config?: AllowedMWS<R, T, C>) {
    super()
    if (config) {
      this._config = getMultWaySwitchConfig(config)
    }
  }

  public override get reportName() {
    return `Templ:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline MultWaySwitch]'
  }

  protected combine(ctx: unknown, retCtx: unknown): unknown {
    if (this.config.combine) {
      return this.config.combine(ctx as ContextType<R>, retCtx as T)
    } else {
      return ctx
    }
  }

  protected combineCase(item: MultiWaySwitchCase<R, T>, ctx: unknown, retCtx: unknown): unknown {
    if (item.combine) {
      return item.combine(ctx as ContextType<R>, retCtx as T)
    } else {
      return this.combine(ctx, retCtx)
    }
  }

  protected split(ctx: unknown): unknown {
    if (this.config.split) {
      return this.config.split(ctx as ContextType<R>) ?? ctx
    } else {
      return ctx
    }
  }

  protected splitCase(item: unknown, ctx: unknown): any {
    if (typeof item === 'object' && item !== null && 'split' in item && typeof item.split === 'function') {
      return item.split(ctx)
    } else {
      return this.split(ctx)
    }
  }

  override compile(rebuild: boolean = false): StageRun<R> {
    let i
    let statics: Array<MultiWaySwitchStatic<R, T>> = []
    let dynamics: Array<MultiWaySwitchDynamic<R, T>> = []

    // Apply to each stage own environment: evaluate, split, combine
    for (i = 0; i < this.config?.cases?.length; i++) {
      let caseItem: MultiWaySwitchCase<R, T> | AnyStage<R>
      caseItem = this.config.cases[i]

      if (caseItem instanceof Function) {
        caseItem = {
          stage: new Stage(caseItem),
          evaluate: true,
        } as MultiWaySwitchStatic<R, T>
      }

      if (isAnyStage(caseItem)) {
        caseItem = {
          stage: caseItem,
          evaluate: true,
        }
      }

      if (caseItem.stage) {
        if (caseItem.stage instanceof Function) {
          caseItem.stage = caseItem.stage
        }
        if (!isAnyStage(caseItem.stage) && typeof caseItem.stage == 'object') {
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
          dynamics.push(caseItem as MultiWaySwitchDynamic<R, T>)
        } else if (typeof caseItem.evaluate === 'boolean' && caseItem.evaluate) {
          statics.push(caseItem as MultiWaySwitchStatic<R, T>)
        }
      }
    }

    let run: StageRun<R> = (err: unknown, ctx: unknown, done: CallbackFunction<R>) => {
      let actuals: Array<MultiWaySwitchCase<R, T>> = []
      actuals.push.apply(actuals, statics)

      for (let i = 0; i < dynamics.length; i++) {
        if (dynamics[i].evaluate(ctx as R)) {
          actuals.push(dynamics[i])
        }
      }

      let iter = 0

      let errors: Array<Error> = []
      let hasError = false

      let next = (index: number) => {
        return (err: unknown, retCtx: Array<unknown>) => {
          iter++
          let cur = actuals[index]
          let res: Possible<unknown> = null
          if (err) {
            if (!hasError) hasError = true
            errors.push(err as Error)
          } else {
            res = this.combineCase(cur, ctx, retCtx)
          }

          if (iter >= actuals.length) {
            return done(hasError ? CreateError(errors) : undefined, (res ?? ctx) as R)
          }
        }
      }
      let stg
      let lctx
      for (i = 0; i < actuals.length; i++) {
        stg = actuals[i]
        lctx = this.splitCase(stg, ctx)

        run_or_execute(stg.stage, err, lctx, next(i) as CallbackFunction<R>)
        // не хватает явной передачи контекста
      }

      if (actuals.length === 0) {
        return done(err, ctx as R)
      }
    }

    this.run = run

    return super.compile(rebuild)
  }
}
