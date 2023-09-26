import { AllowedStage, execute_validate, run_or_execute, Stage, StageRun } from '../../stage'
import { getIfElseConfig } from './getIfElseConfig'
import { IfElseConfig } from './IfElseConfig'

export class IfElse<R, C extends IfElseConfig<R> = IfElseConfig<R>> extends Stage<R, C> {
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
        execute_validate(this.config.condition, context, (err, condition) => {
          if (condition) {
            if (this.config.success) {
              run_or_execute(this.config.success, err, context, done)
            }
          } else {
            if (this.config.failed) {
              run_or_execute(this.config.failed, err, context, done)
            }
          }
        })
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
