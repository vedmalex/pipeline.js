import { AllowedStage, AnyStage, RunPipelineFunction, StageObject } from '../../stage'
import { PipelineConfig } from './PipelineConfig'

export type AllowedPipeline<R extends StageObject> =
  | AllowedStage<R, PipelineConfig<R>>
  | Array<RunPipelineFunction<R> | AnyStage<R>>
