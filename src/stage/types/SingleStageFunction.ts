import * as z from 'zod'
import { CallbackFunction } from './CallbackFunction'
import { is_async_function } from './is_async_function'

export type SingleStage2Function<R> = (ctx: R, callback: CallbackFunction<R>) => void

export const SingleStage2Function = z.function().args(z.unknown(), z.function()).returns(z.void())
export function isSingleStageFunction2<R>(inp?: unknown): inp is SingleStage2Function<R> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length == 2
}

export type SingleStage3Function<R> = (err: unknown, ctx: R, callback: CallbackFunction<R>) => void
export const SingleStage3Function = z.function().args(z.unknown(), z.unknown(), z.function()).returns(z.void())
export function isSingleStage3Function<R>(inp?: unknown): inp is SingleStage3Function<R> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length == 3
}

export function isSingleStageFunction<R>(inp?: unknown): inp is SingleStageFunction<R> {
  return isSingleStage3Function<R>(inp) || isSingleStageFunction2<R>(inp)
}
export type SingleStageFunction<R> = SingleStage2Function<R> | SingleStage3Function<R>
export const SingleStageFunction = z.union([SingleStage2Function, SingleStage3Function])
