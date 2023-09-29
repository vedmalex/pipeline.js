import {
  CallbackFunction,
  isAnyStage,
  makeCallback,
  makeCallbackArgs,
  Possible,
  run_or_execute,
  Stage,
  StageConfig,
  StageRun,
} from '../../stage'
import { AllowedMWS } from './AllowedMWS'
import { getMultWaySwitchConfig } from './getMultWaySwitchConfig'
import { MultiWaySwitchCase } from './MultiWaySwitchCase'
import { MultiWaySwitchDynamic } from './MultiWaySwitchDynamic'
import { MultiWaySwitchStatic } from './MultiWaySwitchStatic'
import { MultWaySwitchConfig } from './MultWaySwitchConfig'

export class MultiWaySwitch<
  Input,
  Output,
  T,
  Config extends MultWaySwitchConfig<Input, Output, T> = MultWaySwitchConfig<Input, Output, T>,
> extends Stage<Input, Output, Config> {
  constructor(config?: AllowedMWS<Input, Output, T, Config>) {
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

  protected combine(ctx: Input, retCtx: T): Output {
    if (this.config.combine) {
      return this.config.combine(ctx, retCtx)
    } else {
      return ctx as unknown as Output
    }
  }

  protected combineCase(item: MultiWaySwitchCase<Input, Output, T>, ctx: Input, retCtx: T): Output {
    if (item.combine) {
      return item.combine(ctx, retCtx)
    } else {
      return this.combine(ctx, retCtx)
    }
  }

  protected split(ctx: Input): unknown {
    if (this.config.split) {
      return this.config.split(ctx) ?? ctx
    } else {
      return ctx
    }
  }
  // TODO: проверить как работает
  protected splitCase(item: unknown, ctx: Input): any {
    if (typeof item === 'object' && item !== null && 'split' in item && typeof item.split === 'function') {
      return item.split(ctx)
    } else {
      return this.split(ctx)
    }
  }

  override compile(rebuild: boolean = false): StageRun<Input, Output> {
    let i
    let statics: Array<MultiWaySwitchStatic<Input, Output, T>> = []
    let dynamics: Array<MultiWaySwitchDynamic<Input, Output, T>> = []

    // Apply to each stage own environment: evaluate, split, combine
    for (i = 0; i < this.config?.cases?.length; i++) {
      let caseItem: MultiWaySwitchCase<Input, Output, T>
      caseItem = this.config.cases[i]

      if (caseItem instanceof Function) {
        caseItem = {
          stage: new Stage(caseItem),
          evaluate: true,
        } as MultiWaySwitchStatic<Input, Output, T>
      }

      if (isAnyStage(caseItem)) {
        caseItem = {
          stage: caseItem,
          evaluate: true,
        } as MultiWaySwitchCase<Input, Output, T>
      }

      if (caseItem.stage) {
        if (caseItem.stage instanceof Function) {
          caseItem.stage = caseItem.stage
        }
        if (!isAnyStage<Input, Output>(caseItem.stage) && typeof caseItem.stage == 'object') {
          caseItem.stage = new Stage<Input, Output, StageConfig<Input, Output>>(caseItem.stage)
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
          dynamics.push(caseItem as MultiWaySwitchDynamic<Input, Output, T>)
        } else if (typeof caseItem.evaluate === 'boolean' && caseItem.evaluate) {
          statics.push(caseItem as MultiWaySwitchStatic<Input, Output, T>)
        }
      }
    }

    let run: StageRun<Input, Output> = (err, ctx, done) => {
      let actuals: Array<MultiWaySwitchCase<Input, Output, T>> = []
      actuals.push.apply(actuals, statics)

      for (let i = 0; i < dynamics.length; i++) {
        if (dynamics[i].evaluate(ctx)) {
          actuals.push(dynamics[i])
        }
      }

      let iter = 0

      let errors: Array<Error> = []
      let hasError = false

      let next = (index: number) => {
        return makeCallback((err: unknown, retCtx: T) => {
          iter++
          let cur = actuals[index]
          let res: Possible<Output> = null
          if (err) {
            if (!hasError) {
              hasError = true
            }
            errors.push(err as Error)
          } else {
            res = this.combineCase(cur, ctx, retCtx)
          }

          if (iter >= actuals.length) {
            return done(makeCallbackArgs(hasError ? errors : undefined, res ?? ctx as unknown as Output))
          }
        })
      }

      let stg
      let lctx
      for (i = 0; i < actuals.length; i++) {
        stg = actuals[i]
        lctx = this.splitCase(stg, ctx)

        run_or_execute(stg.stage, err, lctx, next(i) as CallbackFunction<Input, T>)
        // не хватает явной передачи контекста
      }

      if (actuals.length === 0) {
        return done(makeCallbackArgs(err, ctx as unknown as Output))
      }
    }

    this.run = run

    return super.compile(rebuild)
  }
}
