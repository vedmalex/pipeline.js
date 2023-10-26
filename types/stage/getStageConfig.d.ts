import { StageConfig } from './StageConfig';
import { AllowedStage, AnyStage } from './types';
export declare const StageSymbol: unique symbol;
export declare function isAnyStage<Input, Output>(obj: unknown): obj is AnyStage<Input, Output>;
export declare function isAllowedStage<Input, Output, Config>(inp: any): inp is AllowedStage<Input, Output, Config>;
export declare function getStageConfig<Input, Output, Config extends StageConfig<Input, Output>>(config: AllowedStage<Input, Output, Config>): Config | AnyStage<Input, Output>;
