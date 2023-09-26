import { CallbackFunction } from '../types'
import { CreateError } from './CreateError'
import { isComplexError } from './isComplexError'

export function process_error<R>(err: unknown, done: CallbackFunction<R>) {
  if (isComplexError(err)) {
    done(err)
  } else {
    done(CreateError(err))
  }
}
