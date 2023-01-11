import { Stage } from './stage'
import { ComplexError } from './utils/ErrorList'
import { execute_validate } from './utils/execute_validate'
import { run_or_execute } from './utils/run_or_execute'
import {
  AllowedStage,
  getIfElseConfig,
  IfElseConfig,
  StageObject,
} from './utils/types'
import { CallbackFunction, Possible, StageRun } from './utils/types'
import { ContextType } from './context'

export class IfElse<T extends StageObject> extends Stage<T, IfElseConfig<T>> {
  constructor(config?: AllowedStage<T, T, IfElseConfig<T>>) {
    super()
    if (config) {
      this._config = getIfElseConfig<T, IfElseConfig<T>>(config)
    }
  }

  public override get reportName() {
    return `Templ:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline IfElse]'
  }

  override compile(rebuild: boolean = false): StageRun<T> {
    let run: StageRun<T> = (
      err: Possible<ComplexError>,
      context: ContextType<T>,
      done: CallbackFunction<T>,
    ) => {
      if (typeof this.config.condition == 'function') {
        execute_validate<T>(this.config.condition, context, ((
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
        }) as CallbackFunction<boolean>)
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

    this.run = run

    return super.compile(rebuild)
  }
}
