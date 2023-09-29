import { CallbackFunction, makeCallbackArgs } from '../types'

export function empty_run<Input, Output>(err: unknown, context: Input, done: CallbackFunction<Input, Output>) {
  done(makeCallbackArgs(err, context as unknown as Output))
}
