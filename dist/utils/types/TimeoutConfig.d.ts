import { StageConfig as StageConfig } from '../../stage/StageConfig';
import { RunPipelineFunction } from '../../stage/RunPipelineFunction';
import { AnyStage } from '../../stage/AnyStage';
export interface TimeoutConfig<R> extends StageConfig<R> {
    timeout?: number | ((ctx: R) => number);
    stage?: AnyStage<R> | RunPipelineFunction<R>;
    overdue?: AnyStage<R> | RunPipelineFunction<R>;
}
//# sourceMappingURL=TimeoutConfig.d.ts.map