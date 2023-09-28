import { CallbackFunction } from '../types'
import { CreateError } from './CreateError'
import { isComplexError } from './isComplexError'

export function process_error<Output>(err: unknown, done: CallbackFunction<Output>) {
  if (isComplexError(err)) {
    done(err)
  } else {
    done(CreateError(err))
  }
}
