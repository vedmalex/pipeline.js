import { CallbackFunction, Possible, StageObject } from './types'

export function empty_run<T extends StageObject>(
  err: Possible<Error>,
  context: Possible<T>,
  done: CallbackFunction<T>,
) {
  done(err, context)
}
