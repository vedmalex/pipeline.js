import { AnyStage, RunPipelineFunction, StageConfig } from '../../stage'

export interface TimeoutConfig<Input, Output> extends StageConfig<Input, Output> {
  timeout?: number | ((ctx: Input) => number)
  stage?: AnyStage<Input, Output> | RunPipelineFunction<Input, Output>
  overdue?: AnyStage<Input, Output> | RunPipelineFunction<Input, Output>
}
