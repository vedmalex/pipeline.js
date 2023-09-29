import { CreateError } from '../errors'
import { CallbackFunction, makeCallback, makeCallbackArgs } from '../types'

export function run_callback_once<Input, Output>(wrapee: CallbackFunction<Input, Output>): CallbackFunction<Input, Output> {
  let done_call = 0
  const c: CallbackFunction<Input, Output> = makeCallback<Input, Output>((err, ctx) => {
    if (done_call == 0) {
      done_call += 1
      wrapee(makeCallbackArgs(err, ctx))
    } else if (err) {
      throw err
    } else {
      throw CreateError('callback called more than once')
    }
  })
  return c
}
