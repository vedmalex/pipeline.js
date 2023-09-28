import { CreateError, ERROR, process_error } from '../errors'
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
              .then(res => done(undefined, res))
              .catch(err => done(err))
          } catch (err) {
            process_error(err, done)
          }
        } else if (isCustomRun0Sync<Input, Output>(run)) {
          try {
            const res = run.apply(context)
            if (res instanceof Promise) {
              res.then(r => done(undefined, r)).catch(err => done(err))
            } else if (is_thenable<Output>(res)) {
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
        if (isCustomRun1Async<Input, Output>(run)) {
          try {
            run
              .call(this, context)
              .then(ctx => done(undefined, ctx))
              .catch(err => done(err))
          } catch (err) {
            process_error(err, done)
          }
        } else if (isCustomRun1Sync<Input, Output>(run)) {
          try {
            const res = run.call(this, context)
            if (res instanceof Promise) {
              res.then(r => done(undefined, r)).catch(err => done(err))
            } else if (is_thenable<Output>(res)) {
              res.then(r => done(undefined, r)).catch(err => done(err))
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
        if (isCustomRun2Async<Input, Output>(run)) {
          try {
            run
              .call(this, err, context)
              .then(ctx => done(undefined, ctx))
              .catch(err => done(err))
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
          done(CreateError(ERROR.signature))
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
          done(CreateError(ERROR.signature))
        }
        break
      default:
        done(CreateError(ERROR.signature))
    }
  }
}
