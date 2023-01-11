import { IContextProxy } from '../context'
import { ComplexError, CreateError } from './ErrorList'
import { ERROR } from './errors'
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
  context: IContextProxy<T>,
  done: (err?: Possible<ComplexError>) => void,
) {
  switch (rescue.length) {
    case 1:
      if (is_func1_async(rescue)) {
        try {
          rescue(err)
            .then(_ => done(undefined))
            .catch(err => done(err))
        } catch (err) {
          process_error(err, done)
        }
      } else if (is_func1(rescue)) {
        try {
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
      if (is_func2_async(rescue)) {
        try {
          rescue(err, context)
            .then(_ => done())
            .catch(err => done(err))
        } catch (err) {
          process_error(err, done)
        }
      } else if (is_func2(rescue)) {
        try {
          const res = rescue(err, context)
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
    case 3:
      if (is_func3(rescue) && !is_func3_async(rescue)) {
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
