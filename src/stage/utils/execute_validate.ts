import {
  CallbackFunction,
  makeCallbackArgs,
  ValidateFunction,
} from '../types'

export function execute_validate<Input>(
  validate: ValidateFunction<Input>,
  context: Input,
  done: CallbackFunction<boolean, boolean>,
) {
  const res = validate(context)
  if (res instanceof Promise) {
    res.then(value => done(makeCallbackArgs(undefined, value)))
  } else {
    done(makeCallbackArgs(undefined, res))
  }
}
