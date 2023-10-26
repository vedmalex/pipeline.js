import { AllowedStage, AnyStage, RunPipelineFunction, StageConfig } from '../../stage';
import { MultiWaySwitchCase } from './MultiWaySwitchCase';
export type AllowedMWS<Input, Output, T, Config extends StageConfig<Input, Output>> = AllowedStage<Input, Output, Config> | Array<AnyStage<Input, Output> | RunPipelineFunction<Input, Output> | MultiWaySwitchCase<Input, Output, T>>;
