import { Stage } from './stage'
import { execute_validate } from './utils/execute_validate'
import { run_or_execute } from './utils/run_or_execute'
import {
  AllowedStage,
  getIfElseConfig,
  IfElseConfig,
  StageObject,
} from './utils/types'
import { CallbackFunction, Possible, StageRun } from './utils/types'

export class IfElse<
  T extends StageObject,
  R extends StageObject = T,
> extends Stage<T, IfElseConfig<T, R>, R> {
  constructor(config?: AllowedStage<T, IfElseConfig<T, R>, R>) {
    super()
    if (config) {
      this._config = getIfElseConfig<T, IfElseConfig<T, R>, R>(config)
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
      err: Possible<Error>,
      context: Possible<T>,
      done: CallbackFunction<R>,
    ) => {
      if (typeof this.config.condition == 'function') {
        execute_validate<T>(
          this.config.condition,
          context,
          (err: Possible<Error>, condition: Possible<boolean>) => {
            if (condition) {
              if (this.config.success) {
                run_or_execute(this.config.success, err, context, done)
              }
            } else {
              if (this.config.failed) {
                run_or_execute(this.config.failed, err, context, done)
              }
            }
          },
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
          done(err, context as unknown as R)
        }
      }
    }

    this.run = run

    return super.compile(rebuild)
  }
}