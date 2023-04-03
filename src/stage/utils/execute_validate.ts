import { CreateError, ERROR, process_error } from '../errors'
import {
  CallbackFunction,
  ValidateFunction,
  ValidateFunction1Async,
  isValidateFunction1Async,
  isValidateFunction1Sync,
  isValidateFunction2Sync,
  is_thenable,
} from '../types'

export function execute_validate<R>(validate: ValidateFunction<R>, context: R, done: CallbackFunction<boolean>) {
  switch (validate.length) {
    case 1:
      if (isValidateFunction1Async(validate)) {
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
      } else if (isValidateFunction1Sync(validate)) {
        try {
          const res = validate(context) as unknown as ValidateFunction1Async<R>
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
      if (isValidateFunction2Sync(validate)) {
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
