import { AnyStage } from './AnyStage';
import { RunPipelineFunction } from './RunPipelineFunction';
export type AllowedStageStored<Input, Output, Config> = Config | RunPipelineFunction<Input, Output> | AnyStage<Input, Output>;
