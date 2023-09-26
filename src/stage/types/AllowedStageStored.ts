import { StageConfig } from '../StageConfig'
import { RunPipelineFunction } from './RunPipelineFunction'
import { AnyStage } from './AnyStage'
import { StageObject } from './StageObject'

/**
 * хранимая часть конфига
 */
export type AllowedStageStored<R extends StageObject, CONFIG extends StageConfig<R>> =
  | CONFIG
  | RunPipelineFunction<R>
  | AnyStage<R>
