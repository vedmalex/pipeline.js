import { CleanError, createError, createCodeError } from './ErrorList'
import { ErrorCode, ErrorMessage } from './errors'
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
      const doubleCallErr = new Error(ErrorMessage[ErrorCode.ERR_CALLBACK_DOUBLE])
      const errors = [err, doubleCallErr].filter((e): e is Error => isError(e));
      throw errors.length > 0
        ? createError(errors, ErrorCode.ERR_CALLBACK_DOUBLE)
        : createCodeError(ErrorCode.ERR_CALLBACK_DOUBLE)
    }
  } as CallbackFunction<T>
  return c
}
