import { ComplexError } from './ErrorList'
import { CallbackFunction, Possible, StageObject } from './types'
import { ContextType } from '../context'

export function empty_run<T extends StageObject>(
  err: Possible<ComplexError>,
  context: ContextType<T>,
  done: CallbackFunction<T>,
) {
  done(err, context)
}
