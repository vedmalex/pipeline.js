import { CallbackFunction } from './CallbackFunction'
import { is_async_function } from './is_async_function'

export type EnsureSync<R> = (ctx: unknown) => R

export type EnsureAsync<R> = (ctx: unknown) => Promise<R>

export type EnsureCallback<R> = (ctx: unknown, done: CallbackFunction<R>) => void

export function isEnsureSync<R>(inp: unknown): inp is EnsureSync<R> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length === 1
}

export function isEnsureAsync<R>(inp: unknown): inp is EnsureAsync<R> {
  return is_async_function(inp) && typeof inp == 'function' && inp.length === 1
}

export function isEnsureCallback<R>(inp: unknown): inp is EnsureCallback<R> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length === 2
}

export function isEnsureFunction<R>(inp: unknown): inp is EnsureFunction<R> {
  return isEnsureAsync(inp) || isEnsureSync(inp) || isEnsureCallback(inp)
}

export type EnsureFunction<R> =
  // will throw error
  | EnsureSync<R>
  // will refect with error
  | EnsureAsync<R>
  // will return error in callback
  | EnsureCallback<R>
