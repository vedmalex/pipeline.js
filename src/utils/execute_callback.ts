import { CreateError } from './ErrorList'
import { ERROR } from './errors'
import { process_error } from './process_error'
import { run_callback_once } from './run_callback_once'
import {
  CallbackFunction,
  isCallback0Async,
  isCallback0Sync,
  isCallback1Async,
  isCallback1Sync,
  isCallback2Async,
  isCallback2Callback,
  isCallback3Callback,
  is_thenable,
} from './types/types'

// может не являться async funciton но может вернуть промис, тогда тоже должен отработать как промис
export function execute_callback<R>(err: unknown, run: Function, context: R, _done: CallbackFunction<R>) {
  const done = run_callback_once(_done)
  switch (run.length) {
    // this is the context of the run function
    case 0:
      if (isCallback0Async<R>(run)) {
        try {
          const res = run.call(context)
          res.then(res => done(undefined, res ?? context)).catch(err => done(err))
        } catch (err) {
          process_error(err, done)
        }
      } else if (isCallback0Sync<R>(run)) {
        try {
          const res = run.apply(context)
          if (res instanceof Promise) {
            res.then(_ => done(undefined, res ?? context)).catch(err => done(err))
          } else if (is_thenable(res)) {
            res.then(_ => done(undefined, res ?? context)).catch(err => done(err))
          } else {
            done(undefined, res ?? context)
          }
        } catch (err) {
          process_error(err, done)
        }
      }
      break
    case 1:
      if (isCallback1Async<R>(run)) {
        try {
          run(context)
            .then(ctx => done(undefined, ctx))
            .catch(err => done(err))
        } catch (err) {
          process_error(err, done)
        }
      } else if (isCallback1Sync(run)) {
        try {
          const res = run(context)
          if (res instanceof Promise) {
            res.then(r => done(undefined, r ?? context)).catch(err => done(err))
          } else if (is_thenable<R>(res)) {
            res.then(r => done(undefined, r ?? context)).catch(err => done(err))
          } else {
            done(undefined, res as R)
          }
        } catch (err) {
          process_error(err, done)
        }
      } else {
        done(CreateError(ERROR.signature))
      }
      break
    case 2:
      if (isCallback2Async(run)) {
        try {
          run(err, context)
            .then(ctx => done(undefined, ctx))
            .catch(err => done(err))
        } catch (err) {
          process_error(err, done)
        }
      } else if (isCallback2Callback(run)) {
        try {
          run(context, done)
        } catch (err) {
          process_error(err, done)
        }
      } else {
        done(CreateError(ERROR.signature))
      }
      break
    case 3:
      if (isCallback3Callback<R>(run)) {
        try {
          run(err, context, done)
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
