import { AllowedStage, AnyStage, RunPipelineFunction, StageConfig, StageEvaluateFunction } from '../../stage';
import { CombineFunction } from './CombineFunction';
import { SplitFunction } from './SplitFunction';
export interface MultiWaySwitchDynamic<Input, Output, T> {
    stage: AnyStage<Input, Output> | RunPipelineFunction<Input, Output> | AllowedStage<Input, Output, StageConfig<Input, Output>>;
    evaluate: StageEvaluateFunction<Input>;
    split?: SplitFunction<Input, T>;
    combine?: CombineFunction<Input, Output, T>;
}
