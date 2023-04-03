import { StageConfig as StageConfig } from './StageConfig';
import { RunPipelineFunction } from './RunPipelineFunction';
import { AnyStage } from './AnyStage';
export interface PipelineConfig<R> extends StageConfig<R> {
    stages: Array<AnyStage<R> | RunPipelineFunction<R>>;
}
//# sourceMappingURL=PipelineConfig.d.ts.map