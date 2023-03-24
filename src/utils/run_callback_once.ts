import { CreateError } from './ErrorList'
import { CallbackFunction } from './types/types'

export function run_callback_once<R>(wrapee: CallbackFunction<R>): CallbackFunction<R> {
  let done_call = 0
  const c: CallbackFunction<R> = function (err, ctx) {
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
