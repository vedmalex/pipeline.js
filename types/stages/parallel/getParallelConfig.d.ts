import { AllowedStage } from '../../stage';
import { ParallelConfig } from './ParallelConfig';
export declare function getParallelConfig<Input, Output, T, Config extends ParallelConfig<Input, Output, T>>(config: AllowedStage<Input, Output, Config>): Config;
