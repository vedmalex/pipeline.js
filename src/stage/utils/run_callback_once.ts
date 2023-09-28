import { CreateError } from '../errors'
import { CallbackFunction } from '../types'

export function run_callback_once<Input, Output>(wrapee: CallbackFunction<Output>): CallbackFunction<Output> {
  let done_call = 0
  const c: CallbackFunction<Output> = function (err, ctx) {
    if (done_call == 0) {
      done_call += 1
      wrapee(err, ctx)
    } else if (err) {
      throw err
    } else {
      throw CreateError([ctx, 'callback called more than once'])
    }
  }
  return c
}
