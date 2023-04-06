import { StageObject } from '../../stage'
import { MultiWaySwitchDynamic } from './MultiWaySwitchDynamic'
import { MultiWaySwitchStatic } from './MultiWaySwitchStatic'

export type MultiWaySwitchCase<R extends StageObject, T extends StageObject> =
  | MultiWaySwitchStatic<R, T>
  | MultiWaySwitchDynamic<R, T>
