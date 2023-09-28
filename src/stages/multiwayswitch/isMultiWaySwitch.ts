import { isRunPipelineFunction } from '../../stage'
import { MultiWaySwitchCase } from './MultiWaySwitchCase'

export function isMultiWaySwitch<Input, Output, T>(
  inp: object,
): inp is MultiWaySwitchCase<Input, Output, T> {
  return (
    typeof inp == 'object' && inp != null && 'stage' in inp && isRunPipelineFunction((inp as { stage: any })['stage'])
  )
}
