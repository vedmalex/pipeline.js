import { StageConfig as StageConfig } from './StageConfig';
import { AllowedStage } from './stage/AllowedStage';
import { AnyStage } from './stage/AnyStage';
export declare function getStageConfig<R, C extends StageConfig<R>>(config: AllowedStage<R, C>): C | AnyStage<R>;
//# sourceMappingURL=getStageConfig.d.ts.map