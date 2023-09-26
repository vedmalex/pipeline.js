import { AnyStage, RunPipelineFunction, StageConfig, StageObject } from '../../stage'

export interface PipelineConfig<R extends StageObject> extends StageConfig<R> {
  stages: Array<AnyStage<R> | RunPipelineFunction<R>>
}
