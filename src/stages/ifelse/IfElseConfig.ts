import { AnyStage, Config, RunPipelineFunction, ValidateFunction } from '../../stage'

export interface IfElseConfig<Input, Output> extends Config<Input, Output> {
  condition?: ValidateFunction<Input>
  success?: AnyStage<Input, Output> | RunPipelineFunction<Input, Output>
  failed?: AnyStage<Input, Output> | RunPipelineFunction<Input, Output>
}
