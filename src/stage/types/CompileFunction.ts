import { StageRun } from './StageRun'
import * as z from 'zod'

export type CompileFunction<R> = (rebuild: boolean) => StageRun<R>

export const CompileFunction = z.function().args(z.boolean()).returns(z.function())
export function isCompileFunction<R>(inp?: unknown): inp is CompileFunction<R> {
  return CompileFunction.safeParse(inp).success
}
