import { AnyStage, RunPipelineFunction, StageConfig } from '../../stage'

export interface PipelineConfig<Input, Output> extends StageConfig<Input, Output> {
  stages: Array<AnyStage<Input, Output> | RunPipelineFunction<Input, Output>>
}
