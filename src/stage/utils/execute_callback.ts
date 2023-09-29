import { ERROR, process_error } from '../errors'
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
  makeCallbackArgs,
  Thenable,
} from '../types'
import { run_callback_once } from './run_callback_once'

// может не являться async funciton но может вернуть промис, тогда тоже должен отработать как промис
export function execute_callback<Input, Output>(
  this: AnyStage<Input, Output> | void,
  err: unknown,
  run: unknown,
  context: Input,
  _done: CallbackFunction<Input, Output>,
) {
  const done = run_callback_once(_done)
  if (isStageCallbackFunction<Input, Output>(run)) {
    switch (run.length) {
      // this is the context of the run function
      case 0:
        if (isCallback0Async<Input, Output>(run)) {
          try {
            const res = run.call(context)
            res.then(res => done(makeCallbackArgs(undefined, res ?? context as unknown as Output))).catch(err =>
              done(makeCallbackArgs(err))
            )
          } catch (err) {
            process_error(err, done)
          }
        } else if (isCallback0Sync<Input, Output>(run)) {
          try {
            const res = run.apply(context) as Output | Promise<Output> | Thenable<Output>
            if (res instanceof Promise) {
              res.then(r => done(makeCallbackArgs(undefined, r ?? context as unknown as Output))).catch(err =>
                done(makeCallbackArgs(err))
              )
            } else if (is_thenable(res)) {
              res.then(r => done(makeCallbackArgs(undefined, r ?? context as unknown as Output))).catch(err =>
                done(makeCallbackArgs(err))
              )
            } else {
              done(makeCallbackArgs(undefined, res ?? context as unknown as Output))
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
              .then(ctx => done(makeCallbackArgs(undefined, ctx)))
              .catch(err => done(makeCallbackArgs(err)))
          } catch (err) {
            process_error(err, done)
          }
        } else if (isCallback1Sync<Input, Output>(run)) {
          try {
            const res = run.call(this, context)
            if (res instanceof Promise) {
              res.then(r => done(makeCallbackArgs(undefined, r ?? context as unknown as Output))).catch(err =>
                done(makeCallbackArgs(err))
              )
            } else if (is_thenable<Output>(res)) {
              res.then(r => done(makeCallbackArgs(undefined, r ?? context as unknown as Output))).catch(err =>
                done(makeCallbackArgs(err))
              )
            } else {
              done(makeCallbackArgs(undefined, res))
            }
          } catch (err) {
            process_error(err, done)
          }
        } else {
          done(makeCallbackArgs(ERROR.signature))
        }
        break
      case 2:
        if (isCallback2Async<Input, Output>(run)) {
          try {
            run
              .call(this, err, context)
              .then(ctx => done(makeCallbackArgs(undefined, ctx)))
              .catch(err => done(makeCallbackArgs(err)))
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
          done(makeCallbackArgs(ERROR.signature))
        }
        break
      case 3:
        if (isCallback3Callback<Input, Output>(run)) {
          const _run: CustomRun3Callback<Input, Output> = run as CustomRun3Callback<Input, Output>
          try {
            _run.call(this, err, context, done)
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
}
