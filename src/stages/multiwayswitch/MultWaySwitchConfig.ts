import { AnyStage, StageConfig, StageObject } from '../../stage'
import { CombineFunction } from './CombineFunction'
import { MultiWaySwitchCase } from './MultiWaySwitchCase'
import { SplitFunction } from './SplitFunction'

// пересмотреть!!!!

export interface MultWaySwitchConfig<R extends StageObject, T extends StageObject> extends StageConfig<R> {
  cases: Array<MultiWaySwitchCase<R, T> | AnyStage<R>>
  split?: SplitFunction<R, T>
  combine?: CombineFunction<R, T>
}
