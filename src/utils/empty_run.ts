import { CallbackFunction, Possible, StageObject } from './types'

export function empty_run<T extends StageObject>(
  err: Possible<Error>,
  context: T,
  done: CallbackFunction<T>,
) {
  done(err, context)
}
