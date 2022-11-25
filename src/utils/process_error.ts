import { ComplexError, CreateError } from './ErrorList'
import { CallbackFunction } from './types'

export function process_error<T>(err: unknown, done: CallbackFunction<T>) {
  if (err instanceof ComplexError) {
    done(err)
  } else if (err instanceof Error) {
    done(new ComplexError(err))
  } else if (typeof err == 'string') {
    done(CreateError(err))
  } else {
    done(CreateError(String(err)))
  }
}
