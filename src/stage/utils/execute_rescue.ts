import { CreateError, ERROR, process_error } from '../errors'
import {
  is_thenable,
  isRescue1ASync,
  isRescue1Sync,
  isRescue2ASync,
  isRescue2Sync,
  isRescue3Callback,
  Rescue,
} from '../types'

export function execute_rescue(
  rescue: Rescue,
  err: Error,
  context: unknown,
  done: (err?: unknown) => void,
) {
  switch (rescue.length) {
    case 1:
      if (isRescue1ASync(rescue)) {
        try {
          rescue
            .call(context, err)
            .then(_ => done(undefined))
            .catch(err => done(err))
        } catch (err) {
          process_error(err, done)
        }
      } else if (isRescue1Sync(rescue)) {
        try {
          // if error is not handled, then it will be thrown
          const res = rescue.call(context, err)
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
          rescue
            .call(null, err, context)
            .then(_ => done())
            .catch(err => done(err))
        } catch (err) {
          process_error(err, done)
        }
      } else if (isRescue2Sync(rescue)) {
        try {
          // if error is not handled, then it will be thrown
          const res = rescue.call(null, err, context)
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
          rescue.call(null, err, context, done)
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

export function execute_rescue_async(
  rescue: Rescue,
  err: Error,
  context: unknown,
): Promise<[unknown, unknown]> {
  return new Promise(resolve => {
    execute_rescue(rescue, err, context, err => resolve([err, context]))
  })
}
