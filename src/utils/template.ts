import { Stage } from '../stage'
import { CreateError } from './ErrorList'
import {
  AllowedStage,
  AnyStage,
  getStageConfig,
  RunPipelineFunction,
  StageObject,
} from './types'
import { CallbackFunction, Possible, StageConfig, StageRun } from './types'

export interface TemplateConfig<T extends StageObject, R extends StageObject>
  extends StageConfig<T, R> {
  stage: AnyStage<T, R> | RunPipelineFunction<T, R>
}

export function getTemplateConfig<
  T extends StageObject,
  C extends TemplateConfig<T, R>,
  R extends StageObject,
>(config: AllowedStage<T, C, R>): C {
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
  C extends TemplateConfig<T, R>,
  R extends StageObject,
> extends Stage<T, C, R> {
  constructor(config?: AllowedStage<T, C, R>) {
    super()
    if (config) {
      this._config = getTemplateConfig<T, C, R>(config)
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
      err: Possible<Error>,
      context: Possible<T>,
      done: CallbackFunction<R>,
    ) => {}

    this.run = run

    return super.compile(rebuild)
  }
}
