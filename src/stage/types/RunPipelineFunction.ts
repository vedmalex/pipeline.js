import { AnyStage } from './AnyStage'
import { CallbackFunction } from './CallbackFunction'
import { is_async_function } from './is_async_function'

export type CustomRun0SyncVoid<Input, Output> = (this: Input & Output) => void

export type CustomRun0Sync<Input, Output> = (this: Input) => Output

export type CustomRun0Async<Input, Output> = (this: Input) => Promise<Output>

export type CustomRun1Sync<Input, Output> = (this: AnyStage<Input, Output>, ctx: Input) => Output

export type CustomRun1Async<Input, Output> = (
  this: AnyStage<Input, Output>,
  ctx: Input,
) => Promise<Output>

export type CustomRun2Async<Input, Output> = (
  this: AnyStage<Input, Output>,
  err: any,
  ctx: Input,
) => Promise<Output>

export type CustomRun2Callback<Input, Output> = (
  this: AnyStage<Input, Output> | void,
  ctx: Input,
  done: CallbackFunction<Output>,
) => void

export type CustomRun3Callback<Input, Output> = (
  this: AnyStage<Input, Output> | void,
  err: any,
  ctx: Input,
  done: CallbackFunction<Output>,
) => void

export type RunPipelineFunction<Input, Output> =
  | CustomRun0SyncVoid<Input, Output>
  | CustomRun0Sync<Input, Output>
  | CustomRun0Async<Input, Output>
  | CustomRun1Async<Input, Output>
  | CustomRun1Sync<Input, Output>
  | CustomRun2Callback<Input, Output>
  | CustomRun2Async<Input, Output>
  | CustomRun3Callback<Input, Output>

export function isCustomRun0SyncVoid<Input, Output>(inp: unknown): inp is CustomRun0SyncVoid<Input, Output> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 0
}
export function isCustomRun0Sync<Input, Output>(inp: unknown): inp is CustomRun0Sync<Input, Output> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 0
}
export function isCustomRun0Async<Input, Output>(inp: unknown): inp is CustomRun0Async<Input, Output> {
  return is_async_function(inp) && typeof inp === 'function' && inp.length === 0
}
export function isCustomRun1Async<Input, Output>(inp: unknown): inp is CustomRun1Async<Input, Output> {
  return is_async_function(inp) && typeof inp === 'function' && inp.length === 1
}
export function isCustomRun1Sync<Input, Output>(inp: unknown): inp is CustomRun1Sync<Input, Output> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 1
}
export function isCustomRun2Callback<Input, Output>(inp: unknown): inp is CustomRun2Callback<Input, Output> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 2
}
export function isCustomRun2Async<Input, Output>(inp: unknown): inp is CustomRun2Async<Input, Output> {
  return is_async_function(inp) && typeof inp === 'function' && inp.length === 2
}
export function isCustomRun3Callback<Input, Output>(inp: unknown): inp is CustomRun3Callback<Input, Output> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 3
}

export function isRunPipelineFunction<Input, Output>(inp: unknown): inp is RunPipelineFunction<Input, Output> {
  return (
    isCustomRun0Async(inp)
    || isCustomRun1Async(inp)
    || isCustomRun1Sync(inp)
    || isCustomRun2Async(inp)
    || isCustomRun0Sync(inp)
    || isCustomRun0SyncVoid(inp)
    || isCustomRun2Callback(inp)
    || isCustomRun3Callback(inp)
  )
}
