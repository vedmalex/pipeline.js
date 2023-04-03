import { RunPipelineFunction } from '../stage/RunPipelineFunction';
import { AnyStage } from '../stage/AnyStage';
import { PipelineConfig } from './PipelineConfig';
import { AllowedStage } from '../stage/AllowedStage';
export type AllowedPipeline<R> = AllowedStage<R, PipelineConfig<R>> | Array<RunPipelineFunction<R> | AnyStage<R>>;
//# sourceMappingURL=AllowedPipeline.d.ts.map