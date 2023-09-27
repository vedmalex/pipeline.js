import { AllowedStageStored } from './AllowedStageStored'

/**
 * то что можно передать в конфиг
 */
export type AllowedStage<R, C> = string | AllowedStageStored<R, C>
