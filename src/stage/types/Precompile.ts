import { AnyStage } from './AnyStage'
import { is_async_function } from './is_async_function'

export type Precompile<R> = (this: AnyStage<R>) => void

export function isPrecompile<R>(inp?: unknown): inp is Precompile<R> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length == 0
}
