import { z } from 'zod'
import { ContextType } from '../Context'
import { CallbackFunction, CallbackFunctionSchema } from './CallbackFunction'
import { is_async_function } from './is_async_function'
import { StageObject } from './StageObject'

export type CustomRun1Sync<R extends StageObject> = (ctx: ContextType<R> | R) => ContextType<R>
export const CustomRun1SyncSchema = z.function(z.tuple([z.object({}).passthrough()]), z.object({}).passthrough())

export type CustomRun1Async<R extends StageObject> = (ctx: ContextType<R> | R) => Promise<ContextType<R>>
export const CustomRun1AsyncSchema = z.function(z.tuple([z.object({}).passthrough()]), z.promise((z.object({}).passthrough())))

export type CustomRun2Async<R extends StageObject> = (
  err: unknown,
  ctx: ContextType<R> | R,
) => Promise<ContextType<R>>
export const CustomRun2AsyncSchema = z.function(z.tuple([z.unknown(),z.object({}).passthrough()]), z.promise((z.object({}).passthrough())))

export type CustomRun2Callback<R extends StageObject> = (
  ctx: ContextType<R>,
  done: CallbackFunction<ContextType<R>>,
) => void
export const CustomRun2CallbackSchema = z.function(z.tuple([z.object({}).passthrough(),CallbackFunctionSchema]), z.void())

export type CustomRun3Callback<R extends StageObject> = (
  err: unknown,
  ctx: ContextType<R>,
  done: CallbackFunction<ContextType<R>>,
) => void
export const CustomRun3CallbackSchema = z.function(z.tuple([z.unknown(),z.object({}).passthrough(),CallbackFunctionSchema]), z.void())


export type RunPipelineFunction<R extends StageObject> =
  | CustomRun1Async<R>
  | CustomRun1Sync<R>
  | CustomRun2Callback<R>
  | CustomRun2Async<R>
  | CustomRun3Callback<R>

export const RunPipelineFunctionSchema = z.union(
  [
    CustomRun1SyncSchema,
    CustomRun1AsyncSchema,
    CustomRun2AsyncSchema,
    CustomRun2CallbackSchema,
    CustomRun3CallbackSchema
  ])

export function isCustomRun1Async<R extends StageObject>(inp: unknown): inp is CustomRun1Async<R> {
  return is_async_function(inp) && typeof inp === 'function' && inp.length === 1
}
export function isCustomRun1Sync<R extends StageObject>(inp: unknown): inp is CustomRun1Sync<R> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 1
}
export function isCustomRun2Callback<R extends StageObject>(inp: unknown): inp is CustomRun2Callback<R> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 2
}
export function isCustomRun2Async<R extends StageObject>(inp: unknown): inp is CustomRun2Async<R> {
  return is_async_function(inp) && typeof inp === 'function' && inp.length === 2
}
export function isCustomRun3Callback<R extends StageObject>(inp: unknown): inp is CustomRun3Callback<R> {
  return !is_async_function(inp) && typeof inp === 'function' && inp.length === 3
}

export function isRunPipelineFunction<R extends StageObject>(inp: unknown): inp is RunPipelineFunction<R> {
  return (
    isCustomRun1Async(inp) ||
    isCustomRun1Sync(inp) ||
    isCustomRun2Async(inp) ||
    isCustomRun2Callback(inp) ||
    isCustomRun3Callback(inp)
  )
}
