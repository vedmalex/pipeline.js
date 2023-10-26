import { StageConfig } from '../StageConfig';
import { AllowedStage } from './AllowedStage';
export declare function getNameFrom<Input, Output, Config extends StageConfig<Input, Output>>(config: AllowedStage<Input, Output, Config>): string;
