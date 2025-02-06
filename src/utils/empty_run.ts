import { ComplexError } from './ErrorList'
import { CallbackFunction, Possible, StageObject } from './types'

export function empty_run<T extends StageObject>(
  err: Possible<ComplexError>,
  context: T,
  done: CallbackFunction<T>,
) {
  return Promise.try((err, context) => done(err, context), err, context)
}
