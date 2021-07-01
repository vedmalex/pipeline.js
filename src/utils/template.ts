import { Stage } from '../stage'
import { AllowedStage } from './types'
import { CallbackFunction, StageConfig, StageRun } from './types'

export interface TemplateConfig<T, R> extends StageConfig<T, R> {}

export class Template<T, C extends TemplateConfig<T, R>, R> extends Stage<
  T,
  C,
  R
> {
  constructor(config?: AllowedStage<T, C, R>) {
    super(config)
  }

  public override get reportName() {
    return `PIPE:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline Template]'
  }

  override compile(rebuild: boolean = false): StageRun<T, R> {
    let run: StageRun<T, R> = (
      err: Error | undefined,
      context: T | R,
      done: CallbackFunction<T | R>,
    ) => {}

    this.run = run

    return super.compile(rebuild)
  }
}
