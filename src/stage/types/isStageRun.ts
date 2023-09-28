import { StageRun } from './StageRun'

export function isStageRun<Input, Output>(inp: unknown): inp is StageRun<Input, Output> {
  return typeof inp === 'function' && (inp as StageRun<Input, Output>).length === 3
}
