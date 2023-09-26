import { is_async_function } from './is_async_function'

export type StageEvaluateFunction<R> = (ctx: R) => boolean

export function isEvaluateFunction<R>(inp: any): inp is StageEvaluateFunction<R> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length == 1
}
