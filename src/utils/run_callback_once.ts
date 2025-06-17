import { CleanError, createError } from './ErrorList'
import { CallbackFunction, Possible } from './types'

export function run_callback_once<T>(
  wrapee: CallbackFunction<T>,
): CallbackFunction<T> {
  let done_call = 0
  const c = function (err: Possible<CleanError>, ctx: T) {
    if (done_call == 0) {
      done_call += 1
      wrapee(err, ctx)
    } else {
      // Combine error with callback error properly
      const errors = [err, new Error('callback called more than once')].filter((e): e is Error => e instanceof Error);
      throw errors.length > 0 ? createError(errors) : createError('Callback called more than once')
    }
  } as CallbackFunction<T>
  return c
}
