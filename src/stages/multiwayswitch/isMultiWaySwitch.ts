import { isRunPipelineFunction, StageObject } from '../../stage'
import { MultiWaySwitchCase } from './MultiWaySwitchCase'

export function isMultiWaySwitch<R extends StageObject, T extends StageObject>(
  inp: object,
): inp is MultiWaySwitchCase<R, T> {
  return (
    typeof inp == 'object' && inp != null && 'stage' in inp && isRunPipelineFunction((inp as { stage: any })['stage'])
  )
}
