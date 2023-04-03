import { ComplexError } from './ErrorList'
import { isComplexError } from './isComplexError'
import { CreateError } from './CreateError'
import { CallbackFunction } from '../types'

export function process_error<R>(err: unknown, done: CallbackFunction<R>) {
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

export function process_error_async<R>(err: unknown): Promise<R> {
  return new Promise((resolve, reject) => {
    process_error(err, (err, ctx) => {
      if (err) reject(err)
      else resolve(ctx as R)
    })
  })
}
