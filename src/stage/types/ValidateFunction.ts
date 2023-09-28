import { CallbackFunction } from './CallbackFunction'
import { is_async_function } from './is_async_function'
import { Thenable } from './is_thenable'

export type ValidateFunction0Sync<Input, Output> = (this: Output) => boolean

export function isValidateFunction0Sync<Input, Output>(inp: unknown): inp is ValidateFunction0Sync<Input, Output> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length == 0
}

export type ValidateFunction1Sync<Input, Output> = (this: void, ctx: Output) => boolean
export function isValidateFunction1Sync<Input, Output>(inp: unknown): inp is ValidateFunction1Sync<Input, Output> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length == 1
}

export type ValidateFunction1Async<Input, Output> = (this: void, ctx: Output) => Promise<boolean>
export function isValidateFunction1Async<Input, Output>(inp: unknown): inp is ValidateFunction1Async<Input, Output> {
  return is_async_function(inp) && typeof inp == 'function' && inp.length == 1
}

export type ValidateFunction1Thenable<Input, Output> = (this: void, ctx: Output) => Thenable<boolean>
export function isValidateFunction1Thenable<Input, Output>(
  inp: unknown,
): inp is ValidateFunction1Thenable<Input, Output> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length == 1
}

export type ValidateFunction2Sync<Input, Output> = (
  this: void,
  ctx: Output,
  callback: CallbackFunction<boolean>,
) => void
export function isValidateFunction2Sync<Input, Output>(inp: unknown): inp is ValidateFunction2Sync<Input, Output> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length == 2
}

export type ValidateFunction<Input, Output> =
  // will throw error
  | ValidateFunction0Sync<Input, Output>
  | ValidateFunction1Sync<Input, Output>
  // will reject with error
  | ValidateFunction1Async<Input, Output>
  | ValidateFunction1Thenable<Input, Output>
  // will return error in callback
  | ValidateFunction2Sync<Input, Output>

export function isValidateFunction<Input, Output>(inp: unknown): inp is ValidateFunction<Input, Output> {
  return (
    isValidateFunction0Sync<Input, Output>(inp)
    || isValidateFunction1Sync<Input, Output>(inp)
    || isValidateFunction1Async<Input, Output>(inp)
    || isValidateFunction1Thenable<Input, Output>(inp)
    || isValidateFunction2Sync<Input, Output>(inp)
  )
}

export type ValidateSync<Input, Output> = (ctx: Output) => Output
export type ValidateAsync<Input, Output> = (ctx: Output) => Promise<Output>
export type ValidateCallback<Input, Output> = (ctx: Output, done: CallbackFunction<Output>) => void
