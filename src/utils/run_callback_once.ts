import { CleanError, createError } from './ErrorList'
import { CallbackFunction, Possible } from './types'
import { isError } from './TypeDetectors'

export function run_callback_once<T>(
  wrapee: CallbackFunction<T>,
): CallbackFunction<T> {
  // OPT-10: boolean flag is faster than integer counter (no increment + == 0 comparison)
  let called = false
  const c = function (err: Possible<CleanError>, ctx: T) {
    if (!called) {
      called = true
      wrapee(err, ctx)
    } else {
      const errors = [err, new Error('callback called more than once')].filter((e): e is Error => isError(e));
      throw errors.length > 0 ? createError(errors) : createError('Callback called more than once')
    }
  } as CallbackFunction<T>
  return c
}
