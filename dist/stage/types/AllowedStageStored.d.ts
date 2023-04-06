import { StageConfig } from '../StageConfig';
import { RunPipelineFunction } from './RunPipelineFunction';
import { AnyStage } from './AnyStage';
import { StageObject } from './StageObject';
export type AllowedStageStored<R extends StageObject, CONFIG extends StageConfig<R>> = CONFIG | RunPipelineFunction<R> | AnyStage<R>;
//# sourceMappingURL=AllowedStageStored.d.ts.map