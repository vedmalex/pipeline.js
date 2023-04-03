import { StageRun } from './StageRun'

export function isStageRun<R>(inp: unknown): inp is StageRun<R> {
  return typeof inp === 'function' && inp?.length == 3
}
