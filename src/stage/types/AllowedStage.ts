import { AllowedStageStored } from './AllowedStageStored'

/**
 * то что можно передать в конфиг
 */
export type AllowedStage<Input, Output, Config> = string | AllowedStageStored<Input, Output, Config>
