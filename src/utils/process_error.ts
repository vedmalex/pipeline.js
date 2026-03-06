import { createError, isCleanError } from './ErrorList'
import { CallbackFunction } from './types'
import { isError } from './TypeDetectors'

export function process_error<T>(err: unknown, done: CallbackFunction<T>) {
  if (isCleanError(err)) {
    done(err)
  } else if (isError(err)) {
    done(createError(err))
  } else if (typeof err == 'string') {
    done(createError(err))
  } else {
    done(createError(String(err)))
  }
}
