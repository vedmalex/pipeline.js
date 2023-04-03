import * as z from 'zod'
import { CallbackFunction } from './CallbackFunction'
import { Thanable } from './is_thenable'

export type ValidateFunction0Sync<R> = (this: R) => boolean
export const ValidateFunction0Sync = z.function().returns(z.boolean())

export function isValidateFunction0Sync<R>(inp: unknown): inp is ValidateFunction0Sync<R> {
  return ValidateFunction0Sync.safeParse(inp).success
}

export type ValidateFunction1Sync<R> = (this: void, ctx: R) => boolean
export const ValidateFunction1Sync = z.function().args(z.any()).returns(z.boolean())
export function isValidateFunction1Sync<R>(inp: unknown): inp is ValidateFunction1Sync<R> {
  return ValidateFunction1Sync.safeParse(inp).success
}

export type ValidateFunction1Async<R> = (this: void, ctx: R) => Promise<boolean>
export const ValidateFunction1Async = z.function().args(z.any()).returns(z.promise(z.boolean()))
export function isValidateFunction1Async<R>(inp: unknown): inp is ValidateFunction1Async<R> {
  return ValidateFunction1Async.safeParse(inp).success
}

export type ValidateFunction1Thenable<R> = (this: void, ctx: R) => Thanable<boolean>
export const ValidateFunction1Thenable = z.function().args(z.any()).returns(z.boolean())
export function isValidateFunction1Thenable<R>(inp: unknown): inp is ValidateFunction1Thenable<R> {
  return ValidateFunction1Thenable.safeParse(inp).success
}

export type ValidateFunction2Sync<R> = (this: void, ctx: R, callback: CallbackFunction<boolean>) => void
export const ValidateFunction2Sync = z.function().args(z.any(), CallbackFunction).returns(z.void())
export function isValidateFunction2Sync<R>(inp: unknown): inp is ValidateFunction2Sync<R> {
  return ValidateFunction2Sync.safeParse(inp).success
}

export type ValidateFunction<R> =
  // will throw error
  | ValidateFunction0Sync<R>
  | ValidateFunction1Sync<R>
  // will reject with error
  | ValidateFunction1Async<R>
  | ValidateFunction1Thenable<R>
  // will return error in callback
  | ValidateFunction2Sync<R>

export const ValidateFunction = z.union([
  ValidateFunction0Sync,
  ValidateFunction1Sync,
  ValidateFunction1Async,
  ValidateFunction1Thenable,
  ValidateFunction2Sync,
])

export function isValidateFunction<R>(inp: unknown): inp is ValidateFunction<R> {
  return ValidateFunction.safeParse(inp).success
}

export type ValidateSync<R> = (ctx: R) => R
export type ValidateAsync<R> = (ctx: R) => Promise<R>
export type ValidateCallback<R> = (ctx: R, done: CallbackFunction<R>) => void
