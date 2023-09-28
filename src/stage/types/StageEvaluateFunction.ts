import { is_async_function } from './is_async_function'

export type StageEvaluateFunction<Input> = (ctx: Input) => boolean

export function isEvaluateFunction<Input>(inp: any): inp is StageEvaluateFunction<Input> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length == 1
}
