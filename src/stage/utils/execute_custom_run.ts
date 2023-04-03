import { CreateError, ERROR, process_error } from '../errors'
import {
  CallbackFunction,
  RunPipelineFunction,
  StageRun,
  isCustomRun0Async,
  isCustomRun0Sync,
  isCustomRun1Async,
  isCustomRun1Sync,
  isCustomRun2Async,
  isCustomRun2Callback,
  isCustomRun3Callback,
  is_thenable,
} from '../types'
import { run_callback_once } from './run_callback_once'

// может не являться async funciton но может вернуть промис, тогда тоже должен отработать как промис
export function execute_custom_run<R>(run: RunPipelineFunction<R>): StageRun<R> {
  return function (this: object, err: unknown, context: unknown, _done: CallbackFunction<R>) {
    const done = run_callback_once(_done)
    switch (run.length) {
      // this is the context of the run function
      case 0:
        if (isCustomRun0Async<R>(run)) {
          try {
            run
              .apply(context)
              .then(res => done(undefined, res))
              .catch(err => done(err))
          } catch (err) {
            process_error(err, done)
          }
        } else if (isCustomRun0Sync<R>(run)) {
          try {
            const res = run.apply(context)
            if (res instanceof Promise) {
              res.then(r => done(undefined, r)).catch(err => done(err))
            } else if (is_thenable<R>(res)) {
              res.then(r => done(undefined, r)).catch(err => done(err))
            } else {
              done(undefined, res)
            }
          } catch (err) {
            process_error(err, done)
          }
        }
        break
      case 1:
        if (isCustomRun1Async(run)) {
          try {
            run
              .call(this, context)
              .then(ctx => done(undefined, ctx as R))
              .catch(err => done(err))
          } catch (err) {
            process_error(err, done)
          }
        } else if (isCustomRun1Sync(run)) {
          try {
            const res = run.call(this, context)
            if (res instanceof Promise) {
              res.then(r => done(undefined, r)).catch(err => done(err))
            } else if (is_thenable<R>(res)) {
              res.then(r => done(undefined, r)).catch(err => done(err))
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
        if (isCustomRun2Async(run)) {
          try {
            run
              .call(this, err, context)
              .then(ctx => done(undefined, ctx as R))
              .catch(err => done(err))
          } catch (err) {
            process_error(err, done)
          }
        } else if (isCustomRun2Callback<R>(run)) {
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
        if (isCustomRun3Callback<R>(run)) {
          try {
            //@ts-expect-error
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
}
