import { CreateError } from './ErrorList'
import { ERROR } from './errors'
import { process_error } from './process_error'
import {
  Rescue,
  isRescue1ASync,
  isRescue1Sync,
  isRescue2ASync,
  isRescue2Sync,
  isRescue3Callback,
  is_thenable,
} from './types/types'

export function execute_rescue<R>(rescue: Rescue<R>, err: Error, context: unknown, done: (err?) => void) {
  switch (rescue.length) {
    case 1:
      if (isRescue1ASync(rescue)) {
        try {
          rescue(err)
            .then(_ => done(undefined))
            .catch(err => done(err))
        } catch (err) {
          process_error(err, done)
        }
      } else if (isRescue1Sync(rescue)) {
        try {
          // if error is not handled, then it will be thrown
          const res = rescue(err)
          if (res instanceof Promise) {
            res.then(_ => done()).catch(err => done(err))
          } else if (is_thenable(res)) {
            res.then(_ => done()).catch(err => done(err))
          } else {
            done()
          }
        } catch (err) {
          process_error(err, done)
        }
      } else {
        done(CreateError(ERROR.signature))
      }
      break
    case 2:
      if (isRescue2ASync(rescue)) {
        try {
          rescue(err, context)
            .then(_ => done())
            .catch(err => done(err))
        } catch (err) {
          process_error(err, done)
        }
      } else if (isRescue2Sync(rescue)) {
        try {
          // if error is not handled, then it will be thrown
          const res = rescue(err, context)
          if (res instanceof Promise) {
            res.then(_ => done()).catch(err => done(err))
          } else if (is_thenable(res)) {
            res.then(_ => done()).catch(err => done(err))
          } else {
            if (Boolean(res)) {
              process_error(res, done)
            } else {
              done()
            }
          }
        } catch (err) {
          process_error(err, done)
        }
      } else {
        done(CreateError(ERROR.signature))
      }
      break
    case 3:
      if (isRescue3Callback(rescue)) {
        try {
          rescue(err, context, done)
        } catch (err) {
          process_error(err, done)
        }
      } else {
        done(CreateError(ERROR.signature))
      }
      break
    default:
      done(CreateError(ERROR.signature))
  }
}
