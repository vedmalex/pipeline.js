import { AnyStage, RunPipelineFunction } from '../../stage';
import { CombineFunction } from './CombineFunction';
import { SplitFunction } from './SplitFunction';
export interface MultiWaySwitchStatic<R, T> {
    stage: AnyStage<R> | RunPipelineFunction<R>;
    evaluate?: boolean;
    split?: SplitFunction<R, T>;
    combine?: CombineFunction<R, T>;
}
//# sourceMappingURL=MultiWaySwitchStatic.d.ts.map