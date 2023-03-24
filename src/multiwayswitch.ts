import { Stage } from './stage'
import { CreateError } from './utils/ErrorList'
import { run_or_execute } from './utils/run_or_execute'
import { isAnyStage, SplitFunction } from './utils/types/types'
import {
  AllowedStage,
  getStageConfig,
  isRunPipelineFunction,
  RunPipelineFunction,
  CombineFunction,
  EvaluateFunction,
} from './utils/types/types'
import { CallbackFunction, Possible, StageConfig, StageRun, AnyStage } from './utils/types/types'

export type MultiWaySwitchCase<R> = MultiWaySwitchStatic<R> | MultiWaySwitchDynamic<R>

export interface MultiWaySwitchStatic<R> {
  stage: AnyStage | RunPipelineFunction<R>
  evaluate?: boolean
  split?: SplitFunction<R>
  combine?: CombineFunction<R>
}

export interface MultiWaySwitchDynamic<R> {
  stage: AnyStage | RunPipelineFunction<R>
  evaluate: EvaluateFunction<R>
  split?: SplitFunction<R>
  combine?: CombineFunction<R>
}

export function isMultiWaySwitch<R>(inp: object): inp is MultiWaySwitchCase<R> {
  return (
    typeof inp == 'object' && inp != null && 'stage' in inp && isRunPipelineFunction((inp as { stage: any })['stage'])
  )
}

//пересмотреть!!!!
export interface MultWaySwitchConfig<R> extends StageConfig<R> {
  cases: Array<MultiWaySwitchCase<R>>
  split?: SplitFunction<R>
  combine?: CombineFunction<R>
}

export type AllowedMWS<R, C extends StageConfig<R>> =
  | AllowedStage<R, C>
  | Array<AnyStage | RunPipelineFunction<R> | MultiWaySwitchCase<R>>

export function getMultWaySwitchConfig<R, C extends MultWaySwitchConfig<R>>(config: AllowedMWS<R, C>): C {
  if (Array.isArray(config)) {
    return {
      cases: config.map(item => {
        let res: MultiWaySwitchCase<R>
        if (isRunPipelineFunction(item)) {
          res = { stage: item, evaluate: true }
        } else if (isAnyStage(item)) {
          res = {
            stage: item,
            evaluate: true,
          }
        } else if (isMultiWaySwitch<R>(item)) {
          res = item
        } else {
          throw CreateError('not suitable type for array in pipelin')
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
    return res as C
  }
}

export class MultiWaySwitch<R, C extends MultWaySwitchConfig<R>> extends Stage<R, C> {
  constructor(config?: AllowedStage<R, C>) {
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

  protected combine(ctx: unknown, retCtx: Array<unknown>): unknown {
    if (this.config.combine) {
      return this.config.combine(ctx as R, retCtx)
    } else {
      return ctx
    }
  }

  protected combineCase(item: MultiWaySwitchCase<R>, ctx: unknown, retCtx: Array<unknown>): unknown {
    if (item.combine) {
      return item.combine(ctx as R, retCtx)
    } else {
      return this.combine(ctx, retCtx)
    }
  }

  split(ctx: unknown): unknown {
    if (this.config.split) {
      return this.config.split(ctx as R)
    } else {
      return ctx
    }
  }

  splitCase(item: unknown, ctx: unknown): any {
    if (typeof item === 'object' && item !== null && 'split' in item && typeof item.split === 'function') {
      return item.split(ctx)
    } else {
      return this.split(ctx)
    }
  }

  override compile(rebuild: boolean = false): StageRun<R> {
    let i
    let statics: Array<MultiWaySwitchStatic<R>> = []
    let dynamics: Array<MultiWaySwitchDynamic<R>> = []

    // Apply to each stage own environment: evaluate, split, combine
    for (i = 0; i < this.config?.cases?.length; i++) {
      let caseItem: MultiWaySwitchCase<R>
      caseItem = this.config.cases[i]

      if (caseItem instanceof Function) {
        caseItem = {
          stage: new Stage(caseItem),
          evaluate: true,
        } as MultiWaySwitchStatic<R>
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
          dynamics.push(caseItem as MultiWaySwitchDynamic<R>)
        } else if (typeof caseItem.evaluate === 'boolean' && caseItem.evaluate) {
          statics.push(caseItem as MultiWaySwitchStatic<R>)
        }
      }
    }

    let run: StageRun<R> = (err: unknown, ctx: unknown, done: CallbackFunction<R>) => {
      let actuals: Array<MultiWaySwitchCase<R>> = []
      actuals.push.apply(actuals, statics)

      for (let i = 0; i < dynamics.length; i++) {
        if (dynamics[i].evaluate(ctx as R)) {
          actuals.push(dynamics[i])
        }
      }

      let iter = 0

      let errors: Array<unknown> = []
      let hasError = false

      let next = (index: number) => {
        return (err: unknown, retCtx: Array<unknown>) => {
          iter++
          let cur = actuals[index]
          let res: Possible<unknown> = null
          if (err) {
            if (!hasError) hasError = true
            errors.push(err)
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
        return done(err)
      }
    }

    this.run = run

    return super.compile(rebuild)
  }
}
