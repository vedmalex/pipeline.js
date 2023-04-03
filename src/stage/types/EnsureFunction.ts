import * as z from 'zod'

import { CallbackFunction } from './CallbackFunction'

export type EnsureSync<R> = (ctx: R) => R
export const EnsureSync = z.function().args(z.any()).returns(z.any())

export type EnsureAsync<R> = (ctx: R) => Promise<R>
export const EnsureAsync = z.function().args(z.any()).returns(z.promise(z.any()))

export type EnsureCallback<R> = (ctx: R, done: CallbackFunction<R>) => void
export const EnsureCallback = z.function().args(z.any(), CallbackFunction).returns(z.undefined())

export function isEnsureSync<R>(inp: unknown): inp is EnsureSync<R> {
  return EnsureAsync.safeParse(inp).success
}

export function isEnsureAsync<R>(inp: unknown): inp is EnsureAsync<R> {
  return EnsureAsync.safeParse(inp).success
}

export function isEnsureCallback<R>(inp: unknown): inp is EnsureCallback<R> {
  return EnsureCallback.safeParse(inp).success
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
