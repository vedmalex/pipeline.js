import { StageRun } from './StageRun'
import * as z from 'zod'
import { is_async_function } from './is_async_function'

export type CompileFunction<R> = (rebuild?: boolean) => StageRun<R>

export const CompileFunction = z.function().args(z.boolean().optional()).returns(z.function())
export function isCompileFunction<R>(inp?: unknown): inp is CompileFunction<R> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length <= 1
}
