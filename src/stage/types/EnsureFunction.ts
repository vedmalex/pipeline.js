import { ContextType } from '../Context'
import { CallbackFunction } from './CallbackFunction'
import { is_async_function } from './is_async_function'
import { StageObject } from './StageObject'

export type EnsureSync<R extends StageObject> = (ctx: ContextType<R>) => ContextType<R>

export type EnsureAsync<R extends StageObject> = (ctx: ContextType<R>) => Promise<ContextType<R>>

export type EnsureCallback<R extends StageObject> = (ctx: R, done: CallbackFunction<ContextType<R>>) => void

export function isEnsureSync<R extends StageObject>(inp: unknown): inp is EnsureSync<R> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length === 1
}

export function isEnsureAsync<R extends StageObject>(inp: unknown): inp is EnsureAsync<R> {
  return is_async_function(inp) && typeof inp == 'function' && inp.length === 1
}

export function isEnsureCallback<R extends StageObject>(inp: unknown): inp is EnsureCallback<R> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length === 2
}

export function isEnsureFunction<R extends StageObject>(inp: unknown): inp is EnsureFunction<R> {
  return isEnsureAsync(inp) || isEnsureSync(inp) || isEnsureCallback(inp)
}

export type EnsureFunction<R extends StageObject> =
  // will throw error
  | EnsureSync<R>
  // will refect with error
  | EnsureAsync<R>
  // will return error in callback
  | EnsureCallback<R>
