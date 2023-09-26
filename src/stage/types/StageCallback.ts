import { CallbackFunction } from './CallbackFunction'
import { is_async_function } from './is_async_function'
import { StageObject } from './StageObject'

export type StageCallback<R extends StageObject> =
  | Callback0Sync<R>
  | Callback0Async<R>
  | Callback1Async<R>
  | Callback1Sync<R>
  | Callback2Callback<R>
  | Callback2Async<R>
  | Callback3Callback<R>

export type Callback0Sync<R extends StageObject> = () => R
export type Callback0Async<R extends StageObject> = () => Promise<R>
export type Callback1Sync<R extends StageObject> = (ctx: R) => R
export type Callback1Async<R extends StageObject> = (ctx: R) => Promise<R>
export type Callback2Async<R extends StageObject> = (err: unknown, ctx: R) => Promise<R>
export type Callback2Callback<R extends StageObject> = (ctx: R, done: CallbackFunction<R>) => void
export type Callback3Callback<R extends StageObject> = (err: unknown, ctx: R, done: CallbackFunction<R>) => void

export function isCallback0Sync<R extends StageObject>(inp: unknown): inp is Callback0Sync<R> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 0
}
export function isCallback0Async<R extends StageObject>(inp: unknown): inp is Callback0Async<R> {
  return is_async_function(inp) && typeof inp === 'function' && inp.length === 0
}
export function isCallback1Async<R extends StageObject>(inp: unknown): inp is Callback1Async<R> {
  return is_async_function(inp) && typeof inp === 'function' && inp.length === 1
}
export function isCallback1Sync<R extends StageObject>(inp: unknown): inp is Callback1Sync<R> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 1
}
export function isCallback2Callback<R extends StageObject>(inp: unknown): inp is Callback2Callback<R> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 2
}
export function isCallback2Async<R extends StageObject>(inp: unknown): inp is Callback2Async<R> {
  return is_async_function(inp) && typeof inp === 'function' && inp.length === 2
}
export function isCallback3Callback<R extends StageObject>(inp: unknown): inp is Callback3Callback<R> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 3
}

export function isStageCallbackFunction<R extends StageObject>(inp: any): inp is StageCallback<R> {
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
