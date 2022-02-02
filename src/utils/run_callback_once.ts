import { CreateError } from './ErrorList'
import { CallbackFunction, Possible } from './types'

export function run_callback_once<T> (
  wrapee: CallbackFunction<T>,
): CallbackFunction<T> {
  let done_call = 0
  var c = (err: Possible<Error>, ctx: Possible<T>) => {
    if (done_call == 0) {
      done_call += 1
      wrapee(err, ctx)
    } else if (err) {
      throw err
    } else {
      throw CreateError([err, 'callback called more than once'])
    }
  }
  return c
}
