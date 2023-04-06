import { StageConfig } from './StageConfig';
import { AllowedStage, AnyStage, StageObject } from './types';
export declare const StageSymbol: unique symbol;
export declare function isAnyStage<R extends StageObject>(obj: unknown): obj is AnyStage<R>;
export declare function isAllowedStage<R extends StageObject, C extends StageConfig<R>>(inp: any): inp is AllowedStage<R, C>;
export declare function getStageConfig<R extends StageObject, C extends StageConfig<R>>(config: AllowedStage<R, C>): C | AnyStage<R>;
//# sourceMappingURL=getStageConfig.d.ts.map