import { AllowedStage, AnyStage, RunPipelineFunction, StageConfig, StageObject } from '../../stage'
import { MultiWaySwitchCase } from './MultiWaySwitchCase'

export type AllowedMWS<R extends StageObject, T extends StageObject, C extends StageConfig<R>> =
  | AllowedStage<R, C>
  | Array<AnyStage<R> | RunPipelineFunction<R> | MultiWaySwitchCase<R, T>>
