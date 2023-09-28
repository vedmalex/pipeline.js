import { CallbackFunction } from '../types'

export function empty_run<Input, Output>(err: unknown, context: Input, done: CallbackFunction<Output>) {
  done(err, context as unknown as Output)
}
