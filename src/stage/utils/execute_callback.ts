import { CreateError, ERROR, process_error } from '../errors'
import {
  CallbackFunction,
  isCallback0Async,
  isCallback0Sync,
  isCallback1Async,
  isCallback1Sync,
  isCallback2Async,
  isCallback2Callback,
  isCallback3Callback,
  isStageCallbackFunction,
  is_thenable,
} from '../types'
import { run_callback_once } from './run_callback_once'

// может не являться async funciton но может вернуть промис, тогда тоже должен отработать как промис
export function execute_callback<R>(
  this: object | void,
  err: unknown,
  run: unknown,
  context: R,
  _done: CallbackFunction<R>,
) {
  const done = run_callback_once<R>(_done)
  if (isStageCallbackFunction<R>(run))
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
            run
              .call(this, context)
              .then(ctx => done(undefined, ctx))
              .catch(err => done(err))
          } catch (err) {
            process_error(err, done)
          }
        } else if (isCallback1Sync(run)) {
          try {
            const res = run.call(this, context)
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
            run
              .call(this, err, context)
              .then(ctx => done(undefined, ctx as R))
              .catch(err => done(err))
          } catch (err) {
            process_error(err, done)
          }
        } else if (isCallback2Callback(run)) {
          try {
            //@ts-expect-error
            run.call(this, context, done)
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
            //@ts-ignore
            run.call(this, err, context, done)
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
