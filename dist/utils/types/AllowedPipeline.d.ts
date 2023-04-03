import { RunPipelineFunction } from './RunPipelineFunction';
import { AnyStage } from './AnyStage';
import { PipelineConfig } from './PipelineConfig';
import { AllowedStage } from './AllowedStage';
export type AllowedPipeline<R> = AllowedStage<R, PipelineConfig<R>> | Array<RunPipelineFunction<R> | AnyStage<R>>;
//# sourceMappingURL=AllowedPipeline.d.ts.map