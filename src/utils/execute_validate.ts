import { CreateError } from './ErrorList'
import { ERROR } from './errors'
import { process_error } from './process_error'
import {
  CallbackFunction,
  is_thenable,
  isValidateAsync,
  isValidateCallback,
  isValidateSync,
  ValidateFunction,
} from './types/types'

export function execute_validate(validate: ValidateFunction, context: unknown, done: CallbackFunction<boolean>) {
  switch (validate.length) {
    case 1:
      if (isValidateAsync(validate)) {
        try {
          validate(context)
            .then(res => {
              if (typeof res == 'boolean') {
                done(undefined, res)
              } else {
                done(res)
              }
            })
            .catch(err => done(err))
        } catch (err) {
          process_error(err, done)
        }
      } else if (isValidateSync(validate)) {
        try {
          const res = validate(context)
          if (res instanceof Promise) {
            res.then(res => done(undefined, res)).catch(err => done(err))
          } else if (is_thenable<boolean>(res)) {
            res.then(res => done(undefined, res)).catch(err => done(err))
          } else if (typeof res == 'boolean') {
            if (res) {
              done(undefined, res)
            } else {
              done(CreateError(ERROR.invalid_context))
            }
          } else {
            if (typeof res === 'object' && res) {
              done(res as Error)
            } else {
              done(new Error(String(res)))
            }
          }
        } catch (err) {
          process_error(err, done)
        }
      } else {
        done(CreateError(ERROR.signature))
      }
      break
    case 2:
      if (isValidateCallback(validate)) {
        try {
          validate(context, (err, res) => {
            if (err) done(CreateError(err), res)
            else done(err, res)
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
