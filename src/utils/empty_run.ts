import { CallbackFunction } from './types'

export function empty_run<T>(
  err: Error | undefined,
  context: T,
  done: CallbackFunction<T>,
) {
  done(err, context)
}
