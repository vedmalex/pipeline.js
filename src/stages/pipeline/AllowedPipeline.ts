import { AllowedStage, AnyStage, RunPipelineFunction } from '../../stage'
import { PipelineConfig } from './PipelineConfig'

export type AllowedPipeline<Input, Output> =
  | AllowedStage<Input, Output, PipelineConfig<Input, Output>>
  | Array<RunPipelineFunction<Input, Output> | AnyStage<Input, Output>>
