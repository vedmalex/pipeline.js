import { Stage } from '../stage'
import { ComplexError, CreateError } from './ErrorList'
import {
  AllowedStage,
  AnyStage,
  getStageConfig,
  RunPipelineFunction,
  StageObject,
} from './types'
import { CallbackFunction, Possible, StageConfig, StageRun } from './types'

export interface TemplateConfig<T extends StageObject> extends StageConfig<T> {
  stage: AnyStage<T> | RunPipelineFunction<T>
}

export function getTemplateConfig<
  T extends StageObject,
  C extends TemplateConfig<T>,
>(config: AllowedStage<T, C>): C {
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

export class Template<
  T extends StageObject,
  C extends TemplateConfig<T>,
> extends Stage<T, C> {
  constructor(config?: AllowedStage<T, C>) {
    super()
    if (config) {
      this._config = getTemplateConfig<T, C>(config)
    }
  }

  public override get reportName() {
    return `Templ:${this.config.name ? this.config.name : ''}`
  }

  public override toString() {
    return '[pipeline Template]'
  }

  override compile(rebuild: boolean = false): StageRun<T> {
    let run: StageRun<T> = (
      err: Possible<ComplexError>,
      context: Possible<T>,
      done: CallbackFunction<T>,
    ) => {}

    this.run = run

    return super.compile(rebuild)
  }
}
