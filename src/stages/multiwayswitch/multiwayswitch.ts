import {
  AnyStage,
  CallbackFunction,
  ContextType,
  CreateError,
  Possible,
  Stage,
  StageRun,
  isAnyStage,
  run_or_execute,
} from '../../stage'
import { AllowedMWS } from './AllowedMWS'
import { MultWaySwitchConfig } from './MultWaySwitchConfig'
import { MultiWaySwitchCase } from './MultiWaySwitchCase'
import { MultiWaySwitchDynamic } from './MultiWaySwitchDynamic'
import { MultiWaySwitchStatic } from './MultiWaySwitchStatic'
import { getMultWaySwitchConfig } from './getMultWaySwitchConfig'

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
          caseItem.stage = new Stage<R>(caseItem.stage)
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
