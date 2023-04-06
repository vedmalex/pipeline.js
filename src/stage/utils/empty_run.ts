import { CallbackFunction } from '../types'

export function empty_run<R>(err: unknown, context: R, done: CallbackFunction<R>) {
  done(err, context)
}
