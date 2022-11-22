import { CallbackFunction, Possible, StageObject } from './types'

export function empty_run<T extends StageObject, R>(
  err: Possible<Error>,
  context: Possible<T>,
  done: CallbackFunction<R>,
) {
  done(err, context as unknown as R)
}
