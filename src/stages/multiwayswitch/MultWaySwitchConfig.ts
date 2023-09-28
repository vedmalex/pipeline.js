import { StageConfig } from '../../stage'
import { CombineFunction } from './CombineFunction'
import { MultiWaySwitchCase } from './MultiWaySwitchCase'
import { SplitFunction } from './SplitFunction'

// пересмотреть!!!!

export interface MultWaySwitchConfig<Input, Output, T> extends StageConfig<Input, Output> {
  cases: Array<MultiWaySwitchCase<Input, Output, T>>
  split?: SplitFunction<Input, T>
  combine?: CombineFunction<Input, Output, T>
}
