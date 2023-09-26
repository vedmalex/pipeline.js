import {
  AllowedStage,
  AnyStage,
  RunPipelineFunction,
  StageConfig,
  StageEvaluateFunction,
} from '../../stage'
import { CombineFunction } from './CombineFunction'
import { SplitFunction } from './SplitFunction'

export interface MultiWaySwitchDynamic<R, T> {
  stage: AnyStage<R> | RunPipelineFunction<R> | AllowedStage<R, StageConfig<R>>
  evaluate: StageEvaluateFunction<R>
  split?: SplitFunction<R, T>
  combine?: CombineFunction<R, T>
}
