import { ComplexError, CreateError, isComplexError } from './ErrorList'
import { CallbackFunction } from './types'

export function process_error<T>(err: unknown, done: CallbackFunction<T>) {
  if (isComplexError(err)) {
    done(err)
  } else if (err instanceof Error) {
    done(new ComplexError(err))
  } else if (typeof err == 'string') {
    done(CreateError(err))
  } else {
    done(CreateError(String(err)))
  }
}
