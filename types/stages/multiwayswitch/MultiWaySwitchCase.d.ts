import { MultiWaySwitchDynamic } from './MultiWaySwitchDynamic';
import { MultiWaySwitchStatic } from './MultiWaySwitchStatic';
export type MultiWaySwitchCase<Input, Output, T> = MultiWaySwitchStatic<Input, Output, T> | MultiWaySwitchDynamic<Input, Output, T>;
