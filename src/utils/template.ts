import { Stage } from '../stage'
import {
  IStage,
  SingleStageFunction,
  CallbackFunction,
  StageConfig,
  StageRun,
} from './types'

export interface TemplateConfig<T, R> extends StageConfig<T, R> {}

export class Template<T, C extends TemplateConfig<T, R>, R> extends Stage<
  T,
  C,
  R
> {
  stages!: Array<IStage<any, any, any>>

  constructor(config?: string | C | SingleStageFunction<T>) {
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
