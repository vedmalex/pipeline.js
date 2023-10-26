import { AllowedStage } from '../../stage';
import { TimeoutConfig } from './TimeoutConfig';
export declare function getTimeoutConfig<Input, Output, Config extends TimeoutConfig<Input, Output>>(config: AllowedStage<Input, Output, Config>): Config;
