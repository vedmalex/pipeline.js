import { AllowedStage, AnyStage, RunPipelineFunction } from '../../stage'
import { PipelineConfig } from './PipelineConfig'

export type AllowedPipeline<R> = AllowedStage<R, PipelineConfig<R>> | Array<RunPipelineFunction<R> | AnyStage<R>>
