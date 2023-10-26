import { AllowedStage, AnyStage, StageConfig } from '../../stage';
export declare function getEmptyConfig<Input, Output, Config extends StageConfig<Input, Output>>(config: AllowedStage<Input, Output, Config>): AnyStage<Input, Output> | Config;
