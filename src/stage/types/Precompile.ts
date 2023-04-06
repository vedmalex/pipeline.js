import { AnyStage } from './AnyStage'
import { is_async_function } from './is_async_function'
import { StageObject } from './StageObject'

export type Precompile<R extends StageObject> = (this: AnyStage<R>) => void

export function isPrecompile<R extends StageObject>(inp?: unknown): inp is Precompile<R> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length == 0
}
