import { AllowedStage } from '../../stage';
import { WrapConfig } from './WrapConfig';
export declare function getWrapConfig<Input, Output, T, Config extends WrapConfig<Input, Output, T>>(config: AllowedStage<Input, Output, Config>): Config;
