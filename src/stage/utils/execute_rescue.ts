import { ERROR, process_error } from '../errors'
import {
  CallbackFunction,
  is_thenable,
  isRescue1ASync,
  isRescue1Sync,
  isRescue2ASync,
  isRescue2Sync,
  isRescue3Callback,
  makeCallbackArgs,
  Rescue,
} from '../types'

export function execute_rescue<Input, Output>(
  rescue: Rescue,
  err: Error,
  context: unknown,
  done: CallbackFunction<Input, Output>,
) {
  switch (rescue.length) {
    case 1:
      if (isRescue1ASync(rescue)) {
        try {
          rescue
            .call(context, err)
            .then(_ => done(makeCallbackArgs()))
            .catch(err => done(makeCallbackArgs(err)))
        } catch (err) {
          process_error(err, done)
        }
      } else if (isRescue1Sync(rescue)) {
        try {
          // if error is not handled, then it will be thrown
          const res = rescue.call(context, err)
          if (res instanceof Promise) {
            res.then(_ => done(makeCallbackArgs())).catch(err => done(makeCallbackArgs(err)))
          } else if (is_thenable(res)) {
            res.then(_ => done(makeCallbackArgs())).catch(err => done(makeCallbackArgs(err)))
          } else {
            done(makeCallbackArgs())
          }
        } catch (err) {
          process_error(err, done)
        }
      } else {
        done(makeCallbackArgs(ERROR.signature))
      }
      break
    case 2:
      if (isRescue2ASync(rescue)) {
        try {
          rescue
            .call(null, err, context)
            .then(_ => done(makeCallbackArgs()))
            .catch(err => done(makeCallbackArgs(err)))
        } catch (err) {
          process_error(err, done)
        }
      } else if (isRescue2Sync(rescue)) {
        try {
          // if error is not handled, then it will be thrown
          const res = rescue.call(null, err, context)
          if (res instanceof Promise) {
            res.then(_ => done(makeCallbackArgs())).catch(err => done(makeCallbackArgs(err)))
          } else if (is_thenable(res)) {
            res.then(_ => done(makeCallbackArgs())).catch(err => done(makeCallbackArgs(err)))
          } else {
            if (Boolean(res)) {
              process_error(res, done)
            } else {
              done(makeCallbackArgs())
            }
          }
        } catch (err) {
          process_error(err, done)
        }
      } else {
        done(makeCallbackArgs(ERROR.signature))
      }
      break
    case 3:
      if (isRescue3Callback(rescue)) {
        try {
          // @ts-ignore
          rescue.call(null, err, context, done)
        } catch (err) {
          process_error(err, done)
        }
      } else {
        done(makeCallbackArgs(ERROR.signature))
      }
      break
    default:
      done(makeCallbackArgs(ERROR.signature))
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
