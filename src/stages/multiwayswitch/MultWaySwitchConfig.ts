import { Config } from '../../stage'
import { MultiWaySwitchCase } from './MultiWaySwitchCase'

export interface MultWaySwitchConfig<Input, Output> extends Config<Input, Output> {
  cases: Array<MultiWaySwitchCase<Input, Output, any, any>>
}
