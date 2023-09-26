import { AnyStage } from './AnyStage'
import { RunPipelineFunction } from './RunPipelineFunction'

/**
 * хранимая часть конфига
 */
export type AllowedStageStored<R, C> =
  | C
  | RunPipelineFunction<R>
  | AnyStage<R>
