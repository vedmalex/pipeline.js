import { AnyStage, RunPipelineFunction, StageConfig } from '../../stage'

export interface TimeoutConfig<R> extends StageConfig<R> {
  timeout?: number | ((ctx: R) => number)
  stage?: AnyStage<R> | RunPipelineFunction<R>
  overdue?: AnyStage<R> | RunPipelineFunction<R>
}
