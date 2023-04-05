import * as z from 'zod'
import { CallbackFunction } from './CallbackFunction'
import { is_async_function } from './is_async_function'

export type Rescue1Sync<R> = (ctx: R) => any
export const Rescue1Sync = z.function().args(z.unknown()).returns(z.any())

export type Rescue1ASync<R> = (ctx: R) => Promise<void>
export const Rescue1ASync = z.function().args(z.unknown()).returns(z.promise(z.void()))

export type Rescue2ASync<R> = (err: unknown, ctx: R) => Promise<void>
export const Rescue2ASync = z.function().args(z.unknown(), z.unknown()).returns(z.promise(z.void()))

export type Rescue2Sync<R> = (err: unknown, ctx: R) => R
export const Rescue2Sync = z.function().args(z.unknown(), z.unknown()).returns(z.unknown())

export type Rescue3Callback<R> = (err: unknown, ctx: R, done: CallbackFunction<R>) => void
export const Rescue3Callback = z.function().args(z.unknown(), z.unknown(), z.function()).returns(z.void())

export function isRescue1Sync<R>(inp: unknown): inp is Rescue1Sync<R> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length == 1
}

export function isRescue1ASync<R>(inp: unknown): inp is Rescue1ASync<R> {
  return is_async_function(inp) && typeof inp == 'function' && inp.length == 1
}

export function isRescue2ASync<R>(inp: unknown): inp is Rescue2ASync<R> {
  return is_async_function(inp) && typeof inp == 'function' && inp.length == 2
}

export function isRescue3Callback<R>(inp: unknown): inp is Rescue3Callback<R> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length == 3
}

export function isRescue2Sync<R>(inp: unknown): inp is Rescue2Sync<R> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length == 2
}

export function isRescue<R>(inp: unknown): inp is Rescue<R> {
  return (
    isRescue1ASync(inp) || isRescue1Sync(inp) || isRescue2ASync(inp) || isRescue3Callback(inp) || isRescue2Sync(inp)
  )
}

export type Rescue<R> =
  // context is applied as this
  | Rescue1Sync<R>
  | Rescue1ASync<R>
  // not applied as this
  | Rescue2ASync<R>
  | Rescue2Sync<R>
  | Rescue3Callback<R>

export const Rescue = z.union([Rescue1Sync, Rescue1ASync, Rescue2ASync, Rescue2Sync, Rescue3Callback])
