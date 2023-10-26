import { AnyStage, Config, RunPipelineFunction } from '../../stage';
export interface TimeoutConfig<Input, Output> extends Config<Input, Output> {
    timeout?: number | ((ctx: Input) => number);
    stage?: AnyStage<Input, Output> | RunPipelineFunction<Input, Output>;
    overdue?: AnyStage<Input, Output> | RunPipelineFunction<Input, Output>;
}
