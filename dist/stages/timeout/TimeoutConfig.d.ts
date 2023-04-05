import { StageConfig } from '../../stage/StageConfig';
import { RunPipelineFunction } from '../../stage/types/RunPipelineFunction';
import { AnyStage } from '../../stage/types/AnyStage';
export interface TimeoutConfig<R> extends StageConfig<R> {
    timeout?: number | ((ctx: R) => number);
    stage?: AnyStage<R> | RunPipelineFunction<R>;
    overdue?: AnyStage<R> | RunPipelineFunction<R>;
}
//# sourceMappingURL=TimeoutConfig.d.ts.map