import { StageConfig as StageConfig } from '../stage/StageConfig';
import { RunPipelineFunction } from '../stage/RunPipelineFunction';
import { ValidateFunction } from '../utils/types/ValidateFunction';
import { AnyStage } from '../stage/AnyStage';
export interface IfElseConfig<R> extends StageConfig<R> {
    condition?: boolean | ValidateFunction<R>;
    success?: AnyStage<R> | RunPipelineFunction<R>;
    failed?: AnyStage<R> | RunPipelineFunction<R>;
}
//# sourceMappingURL=IfElseConfig.d.ts.map