import { ContextType } from '../Context'
import { CreateError, ERROR, process_error } from '../errors'
import {
  CallbackFunction,
  StageObject,
  isCallback1Async,
  isCallback1Sync,
  isCallback2Async,
  isCallback2Callback,
  isCallback3Callback,
  isStageCallbackFunction,
  is_thenable,
  CustomRun3Callback,
  CustomRun2Callback,
  AnyStage
} from '../types'
import { run_callback_once } from './run_callback_once'

// может не являться async funciton но может вернуть промис, тогда тоже должен отработать как промис
export function execute_callback<R extends StageObject>(
  this:  AnyStage<R>| void,
  err: unknown,
  run: unknown,
  context: ContextType<R>,
  _done: CallbackFunction<ContextType<R>>,
) {
  const done = run_callback_once(_done)
  if (isStageCallbackFunction<ContextType<R>>(run))
    switch (run.length) {
      // this is the context of the run function
      case 1:
        if (isCallback1Async<ContextType<R>>(run)) {
          try {
            run
              .call(this, context)
              .then(ctx => done(undefined, ctx))
              .catch(err => done(err))
          } catch (err) {
            process_error(err, done)
          }
        } else if (isCallback1Sync<ContextType<R>>(run)) {
          try {
            const res = run.call(this, context)
            if (res instanceof Promise) {
              res.then(r => done(undefined, r ?? context)).catch(err => done(err))
            } else if (is_thenable<ContextType<R>>(res)) {
              res.then(r => done(undefined, r ?? context)).catch(err => done(err))
            } else {
              done(undefined, res)
            }
          } catch (err) {
            process_error(err, done)
          }
        } else {
          done(CreateError(ERROR.signature))
        }
        break
      case 2:
        if (isCallback2Async<ContextType<R>>(run)) {
          try {
            run
              .call(this, err, context)
              .then(ctx => done(undefined, ctx))
              .catch(err => done(err))
          } catch (err) {
            process_error(err, done)
          }
        } else if (isCallback2Callback(run)) {
          const _run = run as CustomRun2Callback<R>
          try {
            _run.call(this, context, done)
          } catch (err) {
            process_error(err, done)
          }
        } else {
          done(CreateError(ERROR.signature))
        }
        break
      case 3:
        if (isCallback3Callback<R>(run)) {
          const _run = run as CustomRun3Callback<R>
          try {
            _run.call(this, err, context, done)
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
