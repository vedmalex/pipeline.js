import { ComplexError } from './ErrorList'
import { CallbackFunction, Possible, StageObject } from './types'

export function empty_run<T extends StageObject>(
  err: Possible<ComplexError>,
  context: T,
  done: CallbackFunction<T>,
) {
  done(err, context)
}
