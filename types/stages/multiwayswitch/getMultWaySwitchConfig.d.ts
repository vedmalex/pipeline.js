import { AllowedMWS } from './AllowedMWS';
import { MultWaySwitchConfig } from './MultWaySwitchConfig';
export declare function getMultWaySwitchConfig<Input, Output, T, Config extends MultWaySwitchConfig<Input, Output, T>>(config: AllowedMWS<Input, Output, T, Config>): Config;
