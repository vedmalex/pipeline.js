import { StageConfig as StageConfig } from '../stage/StageConfig';
import { RunPipelineFunction } from '../stage/RunPipelineFunction';
import { AnyStage } from '../stage/AnyStage';
export interface PipelineConfig<R> extends StageConfig<R> {
    stages: Array<AnyStage<R> | RunPipelineFunction<R>>;
}
//# sourceMappingURL=PipelineConfig.d.ts.map