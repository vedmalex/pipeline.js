import * as z from 'zod'
import { CallbackFunction } from './CallbackFunction'
import { is_async_function } from './is_async_function'

export type CustomRun0SyncVoid = () => void
export const CustomRun0SyncVoid = z.function().args(z.undefined()).returns(z.undefined())

export type CustomRun0Sync<R> = () => R
export const CustomRun0Sync = z.function().args(z.undefined()).returns(z.any())

export type CustomRun0Async<R> = () => Promise<R>
export const CustomRun0Async = z.function().args(z.undefined()).returns(z.promise(z.any()))

export type CustomRun1Sync<R> = (ctx: R) => R
export const CustomRun1Sync = z.function().args(z.any()).returns(z.any())

export type CustomRun1Async<R> = (ctx: R) => Promise<R>
export const CustomRun1Async = z.function().args(z.any()).returns(z.promise(z.any()))

export type CustomRun2Async<R> = (err: any, ctx: R) => Promise<R>
export const CustomRun2Async = z.function().args(z.any(), z.any()).returns(z.promise(z.any()))

export type CustomRun2Callback<R> = (ctx: R, done: CallbackFunction<R>) => void
export const CustomRun2Callback = z.function().args(z.any(), z.function().args(z.any(), z.any()).returns(z.undefined()))

export type CustomRun3Callback<R> = (err: any, ctx: R, done: CallbackFunction<R>) => void
export const CustomRun3Callback = z
  .function()
  .args(z.any(), z.any(), z.function().args(z.any(), z.any()).returns(z.undefined()))

export const RunPipelineFunction = z.union([
  CustomRun0SyncVoid,
  CustomRun0Sync,
  CustomRun0Async,
  CustomRun1Async,
  CustomRun1Sync,
  CustomRun2Callback,
  CustomRun2Async,
  CustomRun3Callback,
])

export type RunPipelineFunction<R> =
  | CustomRun0SyncVoid
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

export function isRunPipelineFunction<R>(inp: any): inp is RunPipelineFunction<R> {
  return (
    isCustomRun0Async(inp) ||
    isCustomRun1Async(inp) ||
    isCustomRun1Sync(inp) ||
    isCustomRun2Async(inp) ||
    isCustomRun0Sync(inp) ||
    isCustomRun2Callback(inp) ||
    isCustomRun3Callback(inp)
  )
}
