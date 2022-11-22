import { CreateError } from './ErrorList'
import { CallbackFunction } from './types'

export function process_error<T>(err: unknown, done: CallbackFunction<T>) {
  if (err instanceof Error) {
    done(err)
  } else if (typeof err == 'string') {
    done(CreateError(err))
  } else {
    done(CreateError(String(err)))
  }
}
