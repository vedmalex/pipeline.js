import { is_async_function } from './is_async_function'
import { StageObject } from './StageObject'

export type StageEvaluateFunction<R extends StageObject> = (ctx: R) => boolean

export function isEvaluateFunction<R extends StageObject>(inp: any): inp is StageEvaluateFunction<R> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length == 1
}
