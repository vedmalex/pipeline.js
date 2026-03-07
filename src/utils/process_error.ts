import { createError, isCleanError } from './ErrorList'
import { ErrorCode } from './errors'
import { CallbackFunction } from './types'
import { isError } from './TypeDetectors'

export function process_error<T>(err: unknown, done: CallbackFunction<T>) {
  if (isCleanError(err)) {
    // Already a CleanError — pass through unchanged (no double-wrapping)
    done(err)
  } else if (isError(err)) {
    done(createError(err, ErrorCode.ERR_STAGE_THROW))
  } else if (typeof err == 'string') {
    done(createError(err, ErrorCode.ERR_STAGE_THROW))
  } else {
    done(createError(String(err), ErrorCode.ERR_STAGE_THROW))
  }
}
