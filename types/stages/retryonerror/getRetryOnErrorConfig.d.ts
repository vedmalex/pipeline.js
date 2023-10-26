import { AllowedStage } from '../../stage';
import { RetryOnErrorConfig } from './RetryOnErrorConfig';
export declare function getRetryOnErrorConfig<Input, Output, T, Config extends RetryOnErrorConfig<Input, Output, T>>(config: AllowedStage<Input, Output, Config>): Config;
