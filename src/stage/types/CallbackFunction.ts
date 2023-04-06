import { is_async_function } from './is_async_function'

export type CallbackFunction<R> = (err?: unknown, res?: R) => void

export function isCallbackFunction<R>(inp?: unknown): inp is CallbackFunction<R> {
  return typeof inp === 'function' && !is_async_function(inp) && inp.length <= 2
}
