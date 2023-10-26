import { AllowedStage } from '../../stage';
import { IfElseConfig } from './IfElseConfig';
export declare function getIfElseConfig<Input, Output, Config extends IfElseConfig<Input, Output>>(config: AllowedStage<Input, Output, Config>): Config;
