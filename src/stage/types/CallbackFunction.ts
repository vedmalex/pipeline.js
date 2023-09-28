import { is_async_function } from './is_async_function'

export type CallbackFunction<Output> = (err?: unknown, res?: Output) => void

export function isCallbackFunction<Output>(inp?: unknown): inp is CallbackFunction<Output> {
  return typeof inp === 'function' && !is_async_function(inp) && inp.length <= 2
}
