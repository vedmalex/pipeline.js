import { AnyStage } from './AnyStage'
import { is_async_function } from './is_async_function'
import { StageRun } from './StageRun'

export type CompileFunction<Input, Output> = (
  this: AnyStage<Input, Output>,
  rebuild?: boolean,
) => StageRun<Input, Output>

export function isCompileFunction<Input, Output>(inp?: unknown): inp is CompileFunction<Input, Output> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length <= 1
}
