import { StageConfig } from '../StageConfig'
import { AllowedStageStored } from './AllowedStageStored'
import { StageObject } from './StageObject'

export type AllowedStage<R extends StageObject, CONFIG extends StageConfig<R>> = string | AllowedStageStored<R, CONFIG>
