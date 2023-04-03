import { StageConfig as StageConfig } from '../StageConfig'
import { RunPipelineFunction } from './RunPipelineFunction'
import { AnyStage } from './AnyStage'

export type AllowedStageStored<R, CONFIG extends StageConfig<R>> = CONFIG | RunPipelineFunction<R> | AnyStage<R>
