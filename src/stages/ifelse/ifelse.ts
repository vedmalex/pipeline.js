import { execute_validate, makeCallback, run_or_execute, Stage, StageRun } from '../../stage'
import { IfElseConfig } from './IfElseConfig'

export class IfElse<Input, Output, Config extends IfElseConfig<Input, Output> = IfElseConfig<Input, Output>>
  extends Stage<Input, Output, Config> {
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
      }
    }

    this.run = run as StageRun<Input, Output>

    return super.compile(rebuild)
  }
}
