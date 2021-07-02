import { CreateError } from './ErrorList'
import {
  CallbackFunction,
  Func1Sync,
  is_thenable,
  Thanable,
  ValidateFunction,
} from './types'
import { is_func2, is_func1_async, is_func1 } from './types'
import { Func1Async } from './types'
import { ERROR } from './errors'
import { process_error } from './process_error'

export function execute_validate<T>(
  validate: ValidateFunction<T>,
  context: T,
  done: CallbackFunction<boolean>,
) {
  switch (validate.length) {
    case 1:
      if (is_func1_async(validate)) {
        try {
          ;(validate as Func1Async<boolean, T>)(context)
            .then(res => done(undefined, res))
            .catch(err => done(err))
        } catch (err) {
          process_error(err, done)
        }
      } else if (is_func1(validate)) {
        try {
          const res = (
            validate as Func1Sync<
              boolean | Promise<boolean> | Thanable<boolean>,
              T
            >
          )(context)
          if (res instanceof Promise) {
            res.then(res => done(undefined, res)).catch(err => done(err))
          } else if (is_thenable(res)) {
            res.then(res => done(undefined, res)).catch(err => done(err))
          } else if (typeof res == 'boolean') {
            if (res) {
              done(undefined, res)
            } else {
              done(CreateError(ERROR.invalid_context))
            }
          } else {
            done(res)
          }
        } catch (err) {
          process_error(err, done)
        }
      } else {
        done(CreateError(ERROR.signature))
      }
      break
    case 2:
      if (is_func2(validate)) {
        try {
          validate(context, (err?: Error, res?: boolean) => {
            done(err, res)
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
