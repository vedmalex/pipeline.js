import { StageConfig, RunPipelineFunction, AnyStage, StageObject } from '../../stage'

export interface PipelineConfig<R extends StageObject> extends StageConfig<R> {
  stages: Array<AnyStage<R> | RunPipelineFunction<R>>
}
