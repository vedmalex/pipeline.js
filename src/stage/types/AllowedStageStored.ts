import { AnyStage } from './AnyStage'
import { RunPipelineFunction } from './RunPipelineFunction'

/**
 * хранимая часть конфига
 */
export type AllowedStageStored<Input, Output, Config> =
  | Config
  | RunPipelineFunction<Input, Output>
  | AnyStage<Input, Output>
