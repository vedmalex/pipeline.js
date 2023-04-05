import { StageConfig } from './StageConfig';
import { AllowedStage, AnyStage } from './types';
export declare const StageSymbol: unique symbol;
export declare function isStage(obj: unknown): boolean;
export declare function isAnyStage<R>(obj: unknown): obj is AnyStage<R>;
export declare function isAllowedStage<R, C extends StageConfig<R>>(inp: any): inp is AllowedStage<R, C>;
export declare function getStageConfig<R, C extends StageConfig<R>>(config: AllowedStage<R, C>): C | AnyStage<R>;
//# sourceMappingURL=getStageConfig.d.ts.map