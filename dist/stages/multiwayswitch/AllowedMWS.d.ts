import { AllowedStage, AnyStage, RunPipelineFunction, StageConfig } from '../../stage';
import { MultiWaySwitchCase } from './MultiWaySwitchCase';
export type AllowedMWS<R, T, C extends StageConfig<R>> = AllowedStage<R, C> | Array<AnyStage<R> | RunPipelineFunction<R> | MultiWaySwitchCase<R, T>>;
//# sourceMappingURL=AllowedMWS.d.ts.map