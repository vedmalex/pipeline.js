import * as z from 'zod'

import { CallbackFunction, CallbackFunctionValidator } from './CallbackFunction'
import { is_async_function } from './is_async_function'

export type EnsureSync<R> = (ctx: R) => R
export const EnsureSync = z.function().args(z.any()).returns(z.any())

export type EnsureAsync<R> = (ctx: R) => Promise<R>
export const EnsureAsync = z.function().args(z.any()).returns(z.promise(z.any()))

export type EnsureCallback<R> = (ctx: R, done: CallbackFunction<R>) => void
export const EnsureCallback = z.function().args(z.any(), CallbackFunctionValidator).returns(z.undefined())

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

export const EnsureFunction = z.union([EnsureSync, EnsureAsync, EnsureCallback])
