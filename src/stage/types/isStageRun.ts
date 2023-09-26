import { StageObject } from './StageObject'
import { StageRun, StageRunSchema } from './StageRun'

export function isStageRun<R extends StageObject>(inp: unknown): inp is StageRun<R> {
  const res = StageRunSchema.safeParse(inp)
  return res.success && (inp as StageRun<R>).length === 3
}
