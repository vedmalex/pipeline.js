import { StageObject } from './StageObject'
import { StageRun } from './StageRun'

export function isStageRun<R extends StageObject>(inp: unknown): inp is StageRun<R> {
  return typeof inp === 'function' && inp?.length == 3
}
