import { ERROR, process_error } from '../errors'
import {
  AnyStage,
  CustomRun2Callback,
  CustomRun3Callback,
  is_thenable,
  isCustomRun0Async,
  isCustomRun0Sync,
  isCustomRun1Async,
  isCustomRun1Sync,
  isCustomRun2Async,
  isCustomRun2Callback,
  isCustomRun3Callback,
  makeCallbackArgs,
  RunPipelineFunction,
  StageRun,
} from '../types'
import { run_callback_once } from './run_callback_once'

// может не являться async funciton но может вернуть промис, тогда тоже должен отработать как промис
export function execute_custom_run<Input, Output>(run: RunPipelineFunction<Input, Output>): StageRun<Input, Output> {
  return function (this: AnyStage<Input, Output>, err, context, _done) {
    const done = run_callback_once(_done)
    switch (run.length) {
      // this is the context of the run function
      case 0:
        if (isCustomRun0Async<Input, Output>(run)) {
          try {
            run
              .apply(context)
              .then(res => done(makeCallbackArgs(undefined, res)))
              .catch(err => done(makeCallbackArgs(err)))
          } catch (err) {
            process_error(err, done)
          }
        } else if (isCustomRun0Sync<Input, Output>(run)) {
          try {
            const res = run.apply(context)
            if (res instanceof Promise) {
              res.then(r => done(makeCallbackArgs(undefined, r))).catch(err => done(makeCallbackArgs(err)))
            } else if (is_thenable<Output>(res)) {
              res.then(r => done(makeCallbackArgs(undefined, r))).catch(err => done(makeCallbackArgs(err)))
            } else {
              done(makeCallbackArgs(undefined, res))
            }
          } catch (err) {
            process_error(err, done)
          }
        }
        break
      case 1:
        if (isCustomRun1Async<Input, Output>(run)) {
          try {
            run
              .call(this, context)
              .then(ctx => done(makeCallbackArgs(undefined, ctx)))
              .catch(err => done(makeCallbackArgs(err)))
          } catch (err) {
            process_error(err, done)
          }
        } else if (isCustomRun1Sync<Input, Output>(run)) {
          try {
            const res = run.call(this, context)
            if (res instanceof Promise) {
              res.then(r => done(makeCallbackArgs(undefined, r))).catch(err => done(makeCallbackArgs(err)))
            } else if (is_thenable<Output>(res)) {
              res.then(r => done(makeCallbackArgs(undefined, r))).catch(err => done(makeCallbackArgs(err)))
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
        if (isCustomRun2Async<Input, Output>(run)) {
          try {
            run
              .call(this, err, context)
              .then(ctx => done(makeCallbackArgs(undefined, ctx)))
              .catch(err => done(makeCallbackArgs(err)))
          } catch (err) {
            process_error(err, done)
          }
        } else if (isCustomRun2Callback<Input, Output>(run)) {
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
        if (isCustomRun3Callback<Input, Output>(run)) {
          const _run: CustomRun3Callback<Input, Output> = run
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
