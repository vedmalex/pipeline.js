import { isComplexError } from './isComplexError'
import { CreateError } from './CreateError'
import { CallbackFunction } from '../types'

export function process_error<R>(err: unknown, done: CallbackFunction<R>) {
  if (isComplexError(err)) {
    done(err)
  } else {
    done(CreateError(err))
  }
}
