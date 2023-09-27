import { AnyStage } from './AnyStage'
import { CallbackFunction } from './CallbackFunction'
import { is_async_function } from './is_async_function'

export type CustomRun0SyncVoid<R> = (this: R) => void

export type CustomRun0Sync<R> = (this: R) => R

export type CustomRun0Async<R> = (this: R) => Promise<R>

export type CustomRun1Sync<R> = (this: AnyStage<R>, ctx: R) => R

export type CustomRun1Async<R> = (
  this: AnyStage<R>,
  ctx: R,
) => Promise<R>

export type CustomRun2Async<R> = (
  this: AnyStage<R>,
  err: any,
  ctx: R,
) => Promise<R>

export type CustomRun2Callback<R> = (
  this: AnyStage<R> | void,
  ctx: R,
  done: CallbackFunction<R>,
) => void

export type CustomRun3Callback<R> = (
  this: AnyStage<R> | void,
  err: any,
  ctx: R,
  done: CallbackFunction<R>,
) => void

export type RunPipelineFunction<R> =
  | CustomRun0SyncVoid<R>
  | CustomRun0Sync<R>
  | CustomRun0Async<R>
  | CustomRun1Async<R>
  | CustomRun1Sync<R>
  | CustomRun2Callback<R>
  | CustomRun2Async<R>
  | CustomRun3Callback<R>

export function isCustomRun0Sync<R>(inp: unknown): inp is CustomRun0Sync<R> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 0
}
export function isCustomRun0Async<R>(inp: unknown): inp is CustomRun0Async<R> {
  return is_async_function(inp) && typeof inp === 'function' && inp.length === 0
}
export function isCustomRun1Async<R>(inp: unknown): inp is CustomRun1Async<R> {
  return is_async_function(inp) && typeof inp === 'function' && inp.length === 1
}
export function isCustomRun1Sync<R>(inp: unknown): inp is CustomRun1Sync<R> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 1
}
export function isCustomRun2Callback<R>(inp: unknown): inp is CustomRun2Callback<R> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 2
}
export function isCustomRun2Async<R>(inp: unknown): inp is CustomRun2Async<R> {
  return is_async_function(inp) && typeof inp === 'function' && inp.length === 2
}
export function isCustomRun3Callback<R>(inp: unknown): inp is CustomRun3Callback<R> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 3
}

export function isRunPipelineFunction<R>(inp: unknown): inp is RunPipelineFunction<R> {
  return (
    isCustomRun0Async(inp)
    || isCustomRun1Async(inp)
    || isCustomRun1Sync(inp)
    || isCustomRun2Async(inp)
    || isCustomRun0Sync(inp)
    || isCustomRun2Callback(inp)
    || isCustomRun3Callback(inp)
  )
}
