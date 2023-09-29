import { CallbackFunction, LegacyCallback } from './CallbackFunction'
import { is_async_function } from './is_async_function'

export type StageCallback<Input, Output> =
  | Callback0Sync<Output>
  | Callback0Async<Output>
  | Callback1Async<Input, Output>
  | Callback1Sync<Input, Output>
  | Callback2Callback<Input, Output>
  | Callback2Async<Input, Output>
  | Callback3Callback<Input, Output>

export type Callback0Sync<Output> = () => Output
export type Callback0Async<Output> = () => Promise<Output>
export type Callback1Sync<Input, Output> = (ctx: Input) => Output
export type Callback1Async<Input, Output> = (ctx: Input) => Promise<Output>
export type Callback2Async<Input, Output> = (err: unknown, ctx: Input) => Promise<Output>
export type Callback2Callback<Input, Output> = (ctx: Input, done: CallbackFunction<Input,Output>) => void
export type Callback2CallbackLegacy<Input, Output> = (ctx: Input, done: LegacyCallback<Output>) => void
export type Callback3Callback<Input, Output> = (err: unknown, ctx: Input, done: CallbackFunction<Input, Output>) => void
export type Callback3CallbackLegacy<Input, Output> = (err: unknown, ctx: Input, done: LegacyCallback<Output>) => void

export function isCallback0Sync<Input, Output>(inp: unknown): inp is Callback0Sync<Output> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 0
}
export function isCallback0Async<Input, Output>(inp: unknown): inp is Callback0Async<Output> {
  return is_async_function(inp) && typeof inp === 'function' && inp.length === 0
}
export function isCallback1Async<Input, Output>(inp: unknown): inp is Callback1Async<Input, Output> {
  return is_async_function(inp) && typeof inp === 'function' && inp.length === 1
}
export function isCallback1Sync<Input, Output>(inp: unknown): inp is Callback1Sync<Input, Output> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 1
}
export function isCallback2Callback<Input, Output>(inp: unknown): inp is Callback2Callback<Input, Output> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 2
}
export function isCallback2Async<Input, Output>(inp: unknown): inp is Callback2Async<Input, Output> {
  return is_async_function(inp) && typeof inp === 'function' && inp.length === 2
}
export function isCallback3Callback<Input, Output>(inp: unknown): inp is Callback3Callback<Input, Output> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 3
}

export function isStageCallbackFunction<Input, Output>(inp: any): inp is StageCallback<Input, Output> {
  return (
    isCallback0Async(inp)
    || isCallback1Async(inp)
    || isCallback1Sync(inp)
    || isCallback2Async(inp)
    || isCallback0Sync(inp)
    || isCallback2Callback(inp)
    || isCallback3Callback(inp)
  )
}
