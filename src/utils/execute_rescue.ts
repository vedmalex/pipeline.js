import { CreateError } from './ErrorList'
import {
  CallbackFunction,
  is_func2_async,
  is_func3,
  is_func3_async,
  is_thenable,
  Rescue,
} from './types'
import { is_func2, is_func1_async, is_func1 } from './types'
import { Func3Sync } from './types'
import { ERROR } from './errors'
import { process_error } from './process_error'

export function execute_rescue<T, R>(
  rescue: Rescue<T, R>,
  err: Error,
  context: T,
  done: (err?: Error) => void,
) {
  switch (rescue.length) {
    case 1:
      if (is_func1_async(rescue)) {
        try {
          rescue(err)
            .then(_ => done())
            .catch(done)
        } catch (err) {
          process_error(err, done)
        }
      } else if (is_func1(rescue)) {
        try {
          const res = rescue(err)
          if (res instanceof Promise) {
            res.then(_ => done()).catch(done)
          } else if (is_thenable(res)) {
            res.then(_ => done()).catch(done)
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
      if (is_func2_async(rescue)) {
        try {
          rescue(err, context)
            .then(_ => done())
            .catch(done)
        } catch (err) {
          process_error(err, done)
        }
      } else if (is_func2(rescue)) {
        try {
          const res = rescue(err, context)
          if (res instanceof Promise) {
            res.then(_ => done()).catch(done)
          } else if (is_thenable(res)) {
            res.then(_ => done()).catch(done)
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
    case 3:
      if (is_func3(rescue) && !is_func3_async(rescue)) {
        try {
          ;(rescue as Func3Sync<void, Error, T, CallbackFunction<R | T>>)(
            err,
            context,
            done,
          )
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