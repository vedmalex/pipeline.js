import { CreateError } from './ErrorList'
import { ERROR } from './errors'
import { process_error } from './process_error'
import {
  CallbackFunction,
  EnsureFunction,
  isEnsureAsync,
  isEnsureCallback,
  isEnsureSync,
  is_thenable,
} from './types/types'

export function execute_ensure<R>(ensure: EnsureFunction<unknown>, context: unknown, done: CallbackFunction<R>) {
  switch (ensure.length) {
    case 1:
      if (isEnsureAsync(ensure)) {
        try {
          ensure(context)
            .then(res => done(undefined, res as R))
            .catch(err => done(err))
        } catch (err) {
          process_error(err, done)
        }
      } else if (isEnsureSync(ensure)) {
        try {
          const res = ensure(context)
          if (res instanceof Promise) {
            res.then(res => done(undefined, res)).catch(err => done(err))
          } else if (is_thenable<R>(res)) {
            res.then(res => done(undefined, res)).catch(err => done(err))
          } else {
            done(undefined, res as R)
          }
        } catch (err) {
          process_error(err, done)
        }
      } else {
        done(CreateError(ERROR.signature))
      }
      break
    case 2:
      if (isEnsureCallback(ensure)) {
        try {
          ensure(context, (err, ctx) => {
            done(err, ctx as R)
          })
        } catch (err) {
          process_error(err, done)
        }
      } else {
        done(CreateError(ERROR.signature))
      }
      break
    default:
      done(CreateError(ERROR.signature))
  }
}
