import { CallbackFunction, makeCallbackArgs } from '../types'

export function process_error<Input, Output>(err: unknown, done: CallbackFunction<Input, Output>) {
  done(makeCallbackArgs(err))
}
