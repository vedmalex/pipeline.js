import { Stage } from '../stage'
import { AllowedStage, getStageConfig, RunPipelineFunction } from './types'
import { CallbackFunction, StageConfig, StageRun } from './types'
import { CreateError } from './ErrorList'

export interface TemplateConfig<T, R> extends StageConfig<T, R> {
  stage: Stage<T, any, R> | RunPipelineFunction<T, R>
}

export function getTemplateConfig<T, C extends TemplateConfig<T, R>, R>(
  config: AllowedStage<T, C, R>,
): C {
  const res = getStageConfig(config)
  if (res instanceof Stage) {
    return { stage: res } as C
  } else if (typeof config == 'object' && !(config instanceof Stage)) {
    if (config.run && config.stage) {
      throw CreateError("don't use run and stage both")
    }
    if (config.run) {
      res.stage = config.run
    }
    if (config.stage) {
      res.stage = config.stage
    }
  } else if (typeof config == 'function' && res.run) {
    res.stage = res.run
    delete res.run
  }
  return res
}

export class Template<T, C extends TemplateConfig<T, R>, R> extends Stage<
  T,
  C,
  R
> {
  constructor(config?: AllowedStage<T, C, R>) {
    super()
    if (config) {
      this._config = getTemplateConfig(config)
    }
  }

  public override get reportName() {
    return `Templ:${this.config.name ? this.config.name : ''}`
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
