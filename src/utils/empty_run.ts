import { CallbackFunction, Possible } from './types'

export function empty_run<T, R> (
  err: Possible<Error>,
  context: Possible<T>,
  done: CallbackFunction<R>,
) {
  done(err, context as unknown as R)
}
