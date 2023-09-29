import { AnyStage, RunPipelineFunction, StageConfig, ValidateFunction } from '../../stage'

export interface IfElseConfig<Input, Output> extends StageConfig<Input, Output> {
  condition?: boolean | ValidateFunction<Input>
  success?: AnyStage<Input, Output> | RunPipelineFunction<Input, Output>
  failed?: AnyStage<Input, Output> | RunPipelineFunction<Input, Output>
}
