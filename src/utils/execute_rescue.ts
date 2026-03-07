import { CleanError, createError, createCodeError } from './ErrorList'
import { isPromise } from './TypeDetectors'
import { ErrorCode } from './errors'
import { process_error } from './process_error'
import {
  is_func2_async,
  is_func3,
  is_func3_async,
  is_thenable,
  Possible,
  Rescue,
} from './types'
import { is_func1, is_func1_async, is_func2 } from './types'

export function execute_rescue<T>(
  rescue: Rescue<T>,
  err: Error,
  context: T,
  done: (err?: Possible<CleanError>) => void,
) {
  // createError() now prevents double-wrapping: if err is already CleanError, it returns as-is
  const cleanErr = createError(err)
  const rescueDone = (
    rescueErr?: Possible<CleanError | Error | string>,
    _ctx?: T,
  ) => {
    if (!rescueErr) {
      done(undefined)
      return
    }

    done(createError(rescueErr))
  }

  switch (rescue.length) {
    case 1:
      if (is_func1_async(rescue)) {
        try {
          rescue(cleanErr)
            .then(_ => done(undefined))
            .catch(err => process_error(err, done))
        } catch (err) {
          process_error(err, done)
        }
      } else if (is_func1(rescue)) {
        try {
          const res = rescue(cleanErr)
          if (isPromise(res)) {
            res.then(_ => done()).catch(err => process_error(err, done))
          } else if (is_thenable(res)) {
            res.then(_ => done()).catch(err => process_error(err, done))
          } else {
            done()
          }
        } catch (err) {
          process_error(err, done)
        }
      } else {
        done(createCodeError(ErrorCode.ERR_SIGNATURE))
      }
      break
    case 2:
      if (is_func2_async(rescue)) {
        try {
          rescue(cleanErr, context)
            .then(_ => done())
            .catch(err => process_error(err, done))
        } catch (err) {
          process_error(err, done)
        }
      } else if (is_func2(rescue)) {
        try {
          const res = rescue(cleanErr, context)
          if (isPromise(res)) {
            res.then(_ => done()).catch(err => process_error(err, done))
          } else if (is_thenable(res)) {
            res.then(_ => done()).catch(err => process_error(err, done))
          } else if (res) {
            done(cleanErr)
          } else {
            done()
          }
        } catch (err) {
          process_error(err, done)
        }
      } else {
        done(createCodeError(ErrorCode.ERR_SIGNATURE))
      }
      break
    case 3:
      if (is_func3(rescue) && !is_func3_async(rescue)) {
        try {
          rescue(cleanErr, context, rescueDone)
        } catch (err) {
          process_error(err, done)
        }
      } else {
        done(createCodeError(ErrorCode.ERR_SIGNATURE))
      }
      break
    default:
      done(createCodeError(ErrorCode.ERR_SIGNATURE))
  }
}
