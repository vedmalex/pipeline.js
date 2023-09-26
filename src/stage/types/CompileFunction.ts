import { AnyStage } from './AnyStage'
import { is_async_function } from './is_async_function'
import { StageObject } from './StageObject'
import { StageRun } from './StageRun'

export type CompileFunction<R extends StageObject> = (this: AnyStage<R>, rebuild?: boolean) => StageRun<R>

export function isCompileFunction<R extends StageObject>(inp?: unknown): inp is CompileFunction<R> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length <= 1
}
