import { ERROR, process_error } from '../errors'
import {
  CallbackFunction,
  is_thenable,
  isValidateFunction1Async,
  isValidateFunction1Sync,
  isValidateFunction2Sync,
  makeCallback,
  makeCallbackArgs,
  ValidateFunction,
  ValidateFunction1Async,
} from '../types'

export function execute_validate<Input>(
  validate: ValidateFunction<Input>,
  context: Input,
  done: CallbackFunction<boolean, boolean>,
) {
  switch (validate.length) {
    case 1:
      if (isValidateFunction1Async(validate)) {
        try {
          validate(context)
            .then(res => {
              if (typeof res == 'boolean') {
                done(makeCallbackArgs(undefined, res))
              } else {
                done(makeCallbackArgs(res))
              }
            })
            .catch(err => done(makeCallbackArgs(err)))
        } catch (err) {
          process_error(err, done)
        }
      } else if (isValidateFunction1Sync(validate)) {
        try {
          const res = validate(context) as unknown as ValidateFunction1Async<Input>
          if (res instanceof Promise) {
            res.then(res => done(makeCallbackArgs(undefined, res))).catch(err => done(makeCallbackArgs(err)))
          } else if (is_thenable<boolean>(res)) {
            res.then(res => done(makeCallbackArgs(undefined, res))).catch(err => done(makeCallbackArgs(err)))
          } else if (typeof res == 'boolean') {
            if (res) {
              done(makeCallbackArgs(undefined, res))
            } else {
              done(makeCallbackArgs(ERROR.invalid_context))
            }
          } else {
            if (typeof res === 'object' && res) {
              done(makeCallbackArgs(res))
            } else {
              done(makeCallbackArgs(res))
            }
          }
        } catch (err) {
          process_error(err, done)
        }
      } else {
        done(makeCallbackArgs(ERROR.signature))
      }
      break
    case 2:
      if (isValidateFunction2Sync<Input>(validate)) {
        try {
          validate(
            context,
            makeCallback((err, res) => {
              if (err) {
                done(makeCallbackArgs(err, res))
              } else {
                done(makeCallbackArgs(err, res))
              }
            }),
          )
        } catch (err) {
          process_error(err, done)
        }
      } else {
        done(makeCallbackArgs(ERROR.signature))
      }
      break
    default:
      done(makeCallbackArgs(ERROR.signature))
  }
}
