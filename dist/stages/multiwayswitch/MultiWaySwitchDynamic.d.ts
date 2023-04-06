import { AllowedStage, AnyStage, RunPipelineFunction, StageConfig, StageEvaluateFunction, StageObject } from '../../stage';
import { CombineFunction } from './CombineFunction';
import { SplitFunction } from './SplitFunction';
export interface MultiWaySwitchDynamic<R extends StageObject, T extends StageObject> {
    stage: AnyStage<R> | RunPipelineFunction<R> | AllowedStage<R, StageConfig<R>>;
    evaluate: StageEvaluateFunction<R>;
    split?: SplitFunction<R, T>;
    combine?: CombineFunction<R, T>;
}
//# sourceMappingURL=MultiWaySwitchDynamic.d.ts.map