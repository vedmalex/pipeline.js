import * as z from 'zod'
import { is_async_function } from './is_async_function'

export type CallbackFunction<R> = (err?: any, res?: R) => void

export const CallbackFunction = z.function().args(z.any().optional(), z.any().optional()).returns(z.void())

export function CallbackFunctionWrap(inp: unknown) {
  if (isCallbackFunction(inp)) {
    return CallbackFunction.implement(inp)
  } else {
    throw new Error('input not suitable for callback')
  }
}

export function isCallbackFunction<R>(inp?: unknown): inp is CallbackFunction<R> {
  return typeof inp === 'function' && !is_async_function(inp) && inp.length <= 2
}
