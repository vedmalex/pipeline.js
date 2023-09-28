import { CreateError, ERROR, process_error } from '../errors'
import {
  AnyStage,
  CallbackFunction,
  CustomRun2Callback,
  CustomRun3Callback,
  is_thenable,
  isCallback0Async,
  isCallback0Sync,
  isCallback1Async,
  isCallback1Sync,
  isCallback2Async,
  isCallback2Callback,
  isCallback3Callback,
  isStageCallbackFunction,
  Thenable,
} from '../types'
import { run_callback_once } from './run_callback_once'

// может не являться async funciton но может вернуть промис, тогда тоже должен отработать как промис
export function execute_callback<Input, Output>(
  this: AnyStage<Input, Output> | void,
  err: unknown,
  run: unknown,
  context: Input,
  _done: CallbackFunction<Output>,
) {
  const done = run_callback_once(_done)
  if (isStageCallbackFunction<Input, Output>(run)) {
    switch (run.length) {
      // this is the context of the run function
      case 0:
        if (isCallback0Async<Input, Output>(run)) {
          try {
            const res = run.call(context)
            res.then(res => done(undefined, res ?? context as unknown as Output)).catch(err => done(err))
          } catch (err) {
            process_error(err, done)
          }
        } else if (isCallback0Sync<Input, Output>(run)) {
          try {
            const res = run.apply(context) as Output | Promise<Output> | Thenable<Output>
            if (res instanceof Promise) {
              res.then(r => done(undefined, r ?? context as unknown as Output)).catch(err => done(err))
            } else if (is_thenable(res)) {
              res.then(r => done(undefined, r ?? context as unknown as Output)).catch(err => done(err))
            } else {
              done(undefined, res ?? context as unknown as Output)
            }
          } catch (err) {
            process_error(err, done)
          }
        }
        break
      case 1:
        if (isCallback1Async<Input, Output>(run)) {
          try {
            run
              .call(this, context)
              .then(ctx => done(undefined, ctx))
              .catch(err => done(err))
          } catch (err) {
            process_error(err, done)
          }
        } else if (isCallback1Sync<Input, Output>(run)) {
          try {
            const res = run.call(this, context)
            if (res instanceof Promise) {
              res.then(r => done(undefined, r ?? context as unknown as Output)).catch(err => done(err))
            } else if (is_thenable<Output>(res)) {
              res.then(r => done(undefined, r ?? context as unknown as Output)).catch(err => done(err))
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
        if (isCallback2Async<Input, Output>(run)) {
          try {
            run
              .call(this, err, context)
              .then(ctx => done(undefined, ctx))
              .catch(err => done(err))
          } catch (err) {
            process_error(err, done)
          }
        } else if (isCallback2Callback(run)) {
          const _run: CustomRun2Callback<Input, Output> = run
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
        if (isCallback3Callback<Input, Output>(run)) {
          const _run: CustomRun3Callback<Input, Output> = run
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
}
