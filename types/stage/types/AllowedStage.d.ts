import { AllowedStageStored } from './AllowedStageStored';
export type AllowedStage<Input, Output, Config> = string | AllowedStageStored<Input, Output, Config>;
