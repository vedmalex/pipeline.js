import { Stage } from './stage'
import { ComplexError } from './utils/ErrorList'
import { execute_validate } from './utils/execute_validate'
import { run_or_execute } from './utils/run_or_execute'
import { AllowedStage, getIfElseConfig, IfElseConfig } from './utils/types/types'
import { CallbackFunction, Possible, StageRun } from './utils/types/types'

export class IfElse<R, C extends IfElseConfig<R>> extends Stage<R, C> {
  constructor(config?: AllowedStage<R, C>) {
    super()
    if (config) {
      this._config = getIfElseConfig(config)
    }
  }

  public override get reportName() {
    return `Templ:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline IfElse]'
  }

  override compile(rebuild: boolean = false): StageRun<R> {
    let run: StageRun<R> = (err, context, done) => {
      if (typeof this.config.condition == 'function') {
        execute_validate(this.config.condition, context, ((
          err: Possible<ComplexError>,
          condition: Possible<boolean>,
        ) => {
          if (condition) {
            if (this.config.success) {
              run_or_execute(this.config.success, err, context, done)
            }
          } else {
            if (this.config.failed) {
              run_or_execute(this.config.failed, err, context, done)
            }
          }
        }) as CallbackFunction<R>)
      } else if (typeof this.config.condition == 'boolean') {
        if (this.config.condition) {
          if (this.config.success) {
            run_or_execute(this.config.success, err, context, done)
          }
        } else {
          if (this.config.failed) {
            run_or_execute(this.config.failed, err, context, done)
          }
        }
      } else {
        if (this.config.success) {
          run_or_execute(this.config.success, err, context, done)
        } else if (this.config.failed) {
          run_or_execute(this.config.failed, err, context, done)
        } else {
          done(err, context)
        }
      }
    }

    this.run = run as StageRun<R>

    return super.compile(rebuild)
  }
}
