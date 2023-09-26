import { ContextType } from '../Context'
import { CreateError, ERROR, process_error } from '../errors'
import {
  CallbackFunction,
  EnsureFunction,
  is_thenable,
  isEnsureAsync,
  isEnsureCallback,
  isEnsureSync,
  StageObject,
} from '../types'

export function execute_ensure<R extends StageObject>(
  ensure: EnsureFunction<R>,
  context: ContextType<R>,
  done: CallbackFunction<ContextType<R>>,
) {
  switch (ensure.length) {
    case 1:
      if (isEnsureAsync<R>(ensure)) {
        try {
          ensure(context)
            .then(res => done(undefined, res))
            .catch(err => done(err))
        } catch (err) {
          process_error(err, done)
        }
      } else if (isEnsureSync<R>(ensure)) {
        try {
          const res = ensure(context)
          if (res instanceof Promise) {
            res.then(res => done(undefined, res)).catch(err => done(err))
          } else if (is_thenable<ContextType<R>>(res)) {
            res.then(res => done(undefined, res)).catch(err => done(err))
          } else {
            done(undefined, res)
          }
        } catch (err) {
          process_error(err, done)
        }
      } else {
        done(CreateError(ERROR.signature))
      }
      break
    case 2:
      if (isEnsureCallback<R>(ensure)) {
        try {
          ensure(context, (err, ctx) => {
            done(err, ctx)
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
