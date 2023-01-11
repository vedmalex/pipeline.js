import { CreateError, ComplexError } from './ErrorList'
import { ERROR } from './errors'
import { process_error } from './process_error'
import {
  CallbackFunction,
  EnsureFunction,
  Func1Sync,
  is_thenable,
  Thanable,
} from './types'
import { is_func1, is_func1_async, is_func2 } from './types'
import { Func1Async } from './types'
import { ContextType } from '../context'

export function execute_ensure<T>(
  ensure: EnsureFunction<T>,
  context: ContextType<T>,
  done: CallbackFunction<T>,
) {
  switch (ensure.length) {
    case 1:
      if (is_func1_async(ensure)) {
        try {
          ;(ensure as Func1Async<ContextType<T>, ContextType<T>>)(context)
            .then(res => done(undefined, res))
            .catch(err => done(err))
        } catch (err) {
          process_error(err, done)
        }
      } else if (is_func1(ensure)) {
        try {
          const res = (
            ensure as Func1Sync<
              | ContextType<T>
              | Promise<ContextType<T>>
              | Thanable<ContextType<T>>,
              T
            >
          )(context)
          if (res instanceof Promise) {
            res.then(res => done(undefined, res)).catch(err => done(err))
          } else if (is_thenable(res)) {
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
      if (is_func2(ensure)) {
        try {
          ensure(context, (err: ComplexError, ctx: ContextType<T>) => {
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
