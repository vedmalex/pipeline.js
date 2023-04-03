import { StageConfig as StageConfig } from './StageConfig';
import { AllowedStage } from './AllowedStage';
import { AnyStage } from './AnyStage';
export declare function getStageConfig<R, C extends StageConfig<R>>(config: AllowedStage<R, C>): C | AnyStage<R>;
//# sourceMappingURL=getStageConfig.d.ts.map