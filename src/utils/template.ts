import { Stage } from '../stage'
import { CreateError } from './ErrorList'
import { AllowedStage, getStageConfig, RunPipelineFunction, AnyStage, StageRun } from './types/types'
import { CallbackFunction, StageConfig, isAnyStage } from './types/types'

export interface TemplateConfig<R> extends StageConfig<R> {
  stage: AnyStage | RunPipelineFunction<R>
}

export function getTemplateConfig<R, C extends TemplateConfig<R>>(config: AllowedStage<R, C>): C {
  const res = getStageConfig(config)
  if (isAnyStage(res)) {
    return { stage: res } as C
  } else if (typeof config == 'object' && !isAnyStage(config)) {
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

export class Template<R, C extends TemplateConfig<R>> extends Stage<R, C> {
  constructor(config?: AllowedStage<R, C>) {
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

  override compile(rebuild: boolean = false): StageRun<R> {
    let run: StageRun<R> = (err: unknown, context: unknown, done: CallbackFunction<R>) => {}

    this.run = run as StageRun<R>

    return super.compile(rebuild)
  }
}
