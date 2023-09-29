import { CallbackFunction } from './CallbackFunction'
import { is_async_function } from './is_async_function'
import { Thenable } from './is_thenable'

export type ValidateFunction0Sync<Output> = (this: Output) => boolean

export function isValidateFunction0Sync< Output>(inp: unknown): inp is ValidateFunction0Sync<Output> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length == 0
}

export type ValidateFunction1Sync<Output> = (this: void, ctx: Output) => boolean
export function isValidateFunction1Sync<Output>(inp: unknown): inp is ValidateFunction1Sync<Output> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length == 1
}

export type ValidateFunction1Async<Output> = (this: void, ctx: Output) => Promise<boolean>
export function isValidateFunction1Async<Output>(inp: unknown): inp is ValidateFunction1Async<Output> {
  return is_async_function(inp) && typeof inp == 'function' && inp.length == 1
}

export type ValidateFunction1Thenable<Output> = (this: void, ctx: Output) => Thenable<boolean>
export function isValidateFunction1Thenable<Output>(
  inp: unknown,
): inp is ValidateFunction1Thenable<Output> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length == 1
}

export type ValidateFunction2Sync<Output> = (
  this: void,
  ctx: Output,
  callback: CallbackFunction<boolean, boolean>,
) => void

export function isValidateFunction2Sync<Output>(inp: unknown): inp is ValidateFunction2Sync< Output> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length == 2
}

export type ValidateFunction<Output> =
  // will throw error
  | ValidateFunction0Sync<Output>
  | ValidateFunction1Sync<Output>
  // will reject with error
  | ValidateFunction1Async<Output>
  | ValidateFunction1Thenable<Output>
  // will return error in callback
  | ValidateFunction2Sync<Output>

export function isValidateFunction<Output>(inp: unknown): inp is ValidateFunction<Output> {
  return (
    isValidateFunction0Sync<Output>(inp)
    || isValidateFunction1Sync<Output>(inp)
    || isValidateFunction1Async<Output>(inp)
    || isValidateFunction1Thenable<Output>(inp)
    || isValidateFunction2Sync<Output>(inp)
  )
}

export type ValidateSync<Output> = (ctx: Output) => Output
export type ValidateAsync<Output> = (ctx: Output) => Promise<Output>
export type ValidateCallback<Output> = (ctx: Output, done: CallbackFunction<Output, Output>) => void
