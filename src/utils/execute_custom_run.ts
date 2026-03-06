import { CleanError, createError } from './ErrorList'
import { isPromise } from './TypeDetectors'
import { ERROR } from './errors'
import { process_error } from './process_error'
import { run_callback_once } from './run_callback_once'
import {
  CallbackFunction,
  Func2Sync,
  is_func2_async,
  is_func3,
  is_func3_async,
  is_thenable,
  Possible,
  RunPipelineFunction,
  StageObject,
  StageRun,
  Thanable,
} from './types'
import {
  is_func0,
  is_func0_async,
  is_func1,
  is_func1_async,
  is_func2,
} from './types'
import { Func3Sync } from './types'

// может не являться async funciton но может вернуть промис, тогда тоже должен отработать как промис

export function execute_custom_run<T extends StageObject>(
  run: RunPipelineFunction<T>,
): StageRun<T> {
  return function (
    this: any,
    err: Possible<CleanError>,
    context: T,
    _done: CallbackFunction<T>,
  ) {
    const done = run_callback_once(_done)
    switch (run.length) {
      // this is the context of the run function
      case 0:
        if (is_func0_async<T>(run)) {
          try {
            const res = run.call(context)
            res.then(r => done(undefined, r)).catch(err => done(err))
          } catch (err) {
            process_error(err, done)
          }
        } else if (is_func0<T>(run)) {
          try {
            const res = run.apply(context)
            if (isPromise(res)) {
              res.then(r => done(undefined, r)).catch(err => done(err))
            } else if (is_thenable<T>(res)) {
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
        if (is_func1_async<T, T>(run)) {
          try {
            run(context)
              .then(ctx => done(undefined, ctx))
              .catch(err => done(err))
          } catch (err) {
            process_error(err, done)
          }
        } else if (
          is_func1<
            T | Promise<T> | Thanable<T>,
            T
          >(run)
        ) {
          try {
            const res = run.call(this, context)
            if (isPromise(res)) {
              res.then(r => done(undefined, r)).catch(err => done(err))
            } else if (is_thenable<T>(res)) {
              res.then(r => done(undefined, r)).catch(err => done(err))
            } else {
              done(undefined, res)
            }
          } catch (err) {
            process_error(err, done)
          }
        } else {
          done(createError(ERROR.signature))
        }
        break
      case 2:
        if (
          is_func2_async<
            T,
            Possible<CleanError>,
            T
          >(run)
        ) {
          try {
            run
              .call(this, err, context)
              .then(ctx => done(undefined, ctx))
              .catch(err => done(err))
          } catch (err) {
            process_error(err, done)
          }
        } else if (is_func2(run)) {
          try {
            ;(run as Func2Sync<void, Possible<T>, CallbackFunction<T>>).call(
              this,
              context,
              done,
            )
          } catch (err) {
            process_error(err, done)
          }
        } else {
          done(createError(ERROR.signature))
        }
        break
      case 3:
        if (is_func3(run) && !is_func3_async(run)) {
          try {
            ;(
              run as Func3Sync<void, Error, Possible<T>, CallbackFunction<T>>
            ).call(this, err as Error, context, done)
          } catch (err) {
            process_error(err, done)
          }
        } else {
          done(createError(ERROR.signature))
        }
        break
      default:
        done(createError(ERROR.signature))
    }
  }
}
