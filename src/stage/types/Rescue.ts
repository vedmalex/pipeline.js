import { CallbackFunction } from './CallbackFunction'
import { is_async_function } from './is_async_function'

export type Rescue1Sync = (this: unknown, err: Error) => any

export type Rescue1ASync = (this: unknown, err: Error) => Promise<void>

export type Rescue2ASync = (this: null, err: Error, ctx: unknown) => Promise<void>

export type Rescue2Sync = (this: null, err: Error, ctx: unknown) => unknown

export type Rescue3Callback = (this: null, err: Error, ctx: unknown, done: CallbackFunction<unknown, unknown>) => void

export function isRescue1Sync(inp: unknown): inp is Rescue1Sync {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length == 1
}

export function isRescue1ASync(inp: unknown): inp is Rescue1ASync {
  return is_async_function(inp) && typeof inp == 'function' && inp.length == 1
}

export function isRescue2ASync(inp: unknown): inp is Rescue2ASync {
  return is_async_function(inp) && typeof inp == 'function' && inp.length == 2
}

export function isRescue3Callback(inp: unknown): inp is Rescue3Callback {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length == 3
}

export function isRescue2Sync(inp: unknown): inp is Rescue2Sync {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length == 2
}

export function isRescue(inp: unknown): inp is Rescue {
  return (
    isRescue1ASync(inp) || isRescue1Sync(inp) || isRescue2ASync(inp) || isRescue3Callback(inp) || isRescue2Sync(inp)
  )
}

export type Rescue =
  // context is applied as this
  | Rescue1Sync
  | Rescue1ASync
  // not applied as this
  | Rescue2ASync
  | Rescue2Sync
  | Rescue3Callback
