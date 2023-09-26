import { StageConfig } from '../StageConfig'
import { AnyStage } from './AnyStage'
import { RunPipelineFunction } from './RunPipelineFunction'
import { StageObject } from './StageObject'

/**
 * хранимая часть конфига
 */
export type AllowedStageStored<R extends StageObject, CONFIG extends StageConfig<R>> =
  | CONFIG
  | RunPipelineFunction<R>
  | AnyStage<R>
