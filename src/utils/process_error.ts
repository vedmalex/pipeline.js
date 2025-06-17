import { createError, isCleanError } from './ErrorList'
import { CallbackFunction } from './types'

export function process_error<T>(err: unknown, done: CallbackFunction<T>) {
  if (isCleanError(err)) {
    done(err)
  } else if (err instanceof Error) {
    done(createError(err))
  } else if (typeof err == 'string') {
    done(createError(err))
  } else {
    done(createError(String(err)))
  }
}
