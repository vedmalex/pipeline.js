import { CallbackArgs } from '../types'
import { process_error } from './process_error'

export function process_error_async<Input, Output>(err: unknown): Promise<CallbackArgs<Input, Output>> {
  return new Promise(resolve => process_error(err, resolve))
}
