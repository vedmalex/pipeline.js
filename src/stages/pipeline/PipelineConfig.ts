import { AnyStage, RunPipelineFunction, StageConfig } from '../../stage'

export interface PipelineConfig<R> extends StageConfig<R> {
  stages: Array<AnyStage<R> | RunPipelineFunction<R>>
}
