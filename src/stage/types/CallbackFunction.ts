import { z } from 'zod'
import { is_async_function } from './is_async_function'

export type CallbackFunction<R> = (err?: unknown, res?: R) => void
export const CallbackFunctionSchema = z.function(z.tuple([z.unknown().optional(),z.object({}).passthrough().optional()]),z.void())

export function isCallbackFunction<R>(inp?: unknown): inp is CallbackFunction<R> {
  return typeof inp === 'function' && !is_async_function(inp) && inp.length <= 2
}
