import * as z from 'zod'
import { CallbackFunction } from './CallbackFunction'

export type SingleStage2Function<R> = (ctx: R, callback: CallbackFunction<R>) => void

export const SingleStage2Function = z.function().args(z.unknown(), z.function()).returns(z.void())
export function isSingleStageFunction2<R>(inp?: unknown): inp is SingleStage2Function<R> {
  return SingleStage2Function.safeParse(inp).success
}

export type SingleStage3Function<R> = (err: unknown, ctx: R, callback: CallbackFunction<R>) => void
export const SingleStage3Function = z.function().args(z.unknown(), z.unknown(), z.function()).returns(z.void())
export function isSingleStage3Function(inp?: unknown): inp is SingleStage3Function<unknown> {
  return SingleStage3Function.safeParse(inp).success
}

export function isSingleStageFunction<R>(inp?: unknown): inp is SingleStageFunction<R> {
  return SingleStageFunction.safeParse(inp).success
}
export type SingleStageFunction<R> = SingleStage2Function<R> | SingleStage3Function<R>
export const SingleStageFunction = z.union([SingleStage2Function, SingleStage3Function])
