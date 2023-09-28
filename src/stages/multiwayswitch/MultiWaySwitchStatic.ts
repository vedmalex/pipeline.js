import { AnyStage, RunPipelineFunction } from '../../stage'
import { CombineFunction } from './CombineFunction'
import { SplitFunction } from './SplitFunction'

export interface MultiWaySwitchStatic<Input, Output, T> {
  stage: AnyStage<Input, Output> | RunPipelineFunction<Input, Output>
  evaluate?: boolean
  split?: SplitFunction<Input, T>
  combine?: CombineFunction<Input, Output, T>
}
