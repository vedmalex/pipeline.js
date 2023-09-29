import {
  AllowedStage,
  execute_validate,
  makeCallback,
  makeCallbackArgs,
  run_or_execute,
  Stage,
  StageRun,
} from '../../stage'
import { getIfElseConfig } from './getIfElseConfig'
import { IfElseConfig } from './IfElseConfig'

export class IfElse<Input, Output, Config extends IfElseConfig<Input, Output> = IfElseConfig<Input, Output>>
  extends Stage<Input, Output, Config> {
  constructor(config?: AllowedStage<Input, Output, Config>) {
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

  override compile(rebuild: boolean = false): StageRun<Input, Output> {
    let run: StageRun<Input, Output> = (err, context, done) => {
      if (typeof this.config.condition == 'function') {
        execute_validate(
          this.config.condition,
          context,
          makeCallback((err, condition) => {
            if (condition) {
              if (this.config.success) {
                run_or_execute(this.config.success, err, context, done)
              }
            } else {
              if (this.config.failed) {
                run_or_execute(this.config.failed, err, context, done)
              }
            }
          }),
        )
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
          done(makeCallbackArgs(err, context as unknown as Output))
        }
      }
    }

    this.run = run as StageRun<Input, Output>

    return super.compile(rebuild)
  }
}
