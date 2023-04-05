import { AnyStage, StageConfig } from '../../stage'
import { CombineFunction } from './CombineFunction'
import { MultiWaySwitchCase } from './MultiWaySwitchCase'
import { SplitFunction } from './SplitFunction'

//пересмотреть!!!!

export interface MultWaySwitchConfig<R, T> extends StageConfig<R> {
  cases: Array<MultiWaySwitchCase<R, T> | AnyStage<R>>
  split?: SplitFunction<R, T>
  combine?: CombineFunction<R, T>
}
