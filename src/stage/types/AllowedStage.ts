import { StageConfig } from '../StageConfig'
import { AllowedStageStored } from './AllowedStageStored'

export type AllowedStage<R, CONFIG extends StageConfig<R>> = string | AllowedStageStored<R, CONFIG>
