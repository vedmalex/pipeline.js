import * as z from 'zod'
import { AnyStage } from './AnyStage'

export type Precompile<R> = (this: AnyStage<R>) => void
export const Precompile = z.function().returns(z.void())

export function isPrecompile<R>(inp?: unknown): inp is Precompile<R> {
  return Precompile.safeParse(inp).success
}
