import { CallbackFunction } from './types/types'

export function empty_run<R>(err: unknown, context: unknown, done: CallbackFunction<R>) {
  done(err, context as R)
}
