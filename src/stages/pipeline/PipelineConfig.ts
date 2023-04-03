import { StageConfig as StageConfig } from '../../stage/StageConfig'
import { RunPipelineFunction } from '../../stage/types/RunPipelineFunction'
import { AnyStage } from '../../stage/types/AnyStage'

export interface PipelineConfig<R> extends StageConfig<R> {
  stages: Array<AnyStage<R> | RunPipelineFunction<R>>
}
