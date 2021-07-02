import { Stage } from './stage'
import { AllowedStage, IfElseConfig, getIfElseConfig } from './utils/types'
import { CallbackFunction, StageRun } from './utils/types'
import { run_or_execute } from './utils/run_or_execute'
import { execute_validate } from './utils/execute_validate'

export class IfElse<T, C extends IfElseConfig<T, R>, R> extends Stage<T, C, R> {
  constructor(config?: AllowedStage<T, C, R>) {
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

  override compile(rebuild: boolean = false): StageRun<T, R> {
    let run: StageRun<T, R> = (
      err: Error | undefined,
      context: T | R,
      done: CallbackFunction<T | R>,
    ) => {
      if (typeof this.config.condition == 'function') {
        execute_validate<T | R>(
          this.config.condition,
          context,
          (err: Error | undefined, condition: boolean | undefined) => {
            if (condition) {
              if (this.config.success)
                run_or_execute(this.config.success, err, context, done)
            } else {
              if (this.config.failed)
                run_or_execute(this.config.failed, err, context, done)
            }
          },
        )
      } else if (typeof this.config.condition == 'boolean') {
        if (this.config.condition) {
          if (this.config.success)
            run_or_execute(this.config.success, err, context, done)
        } else {
          if (this.config.failed)
            run_or_execute(this.config.failed, err, context, done)
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

    this.run = run

    return super.compile(rebuild)
  }
}
