import { CreateError } from './ErrorList'
import { ERROR } from './errors'
import { process_error } from './process_error'
import { run_callback_once } from './run_callback_once'
import {
  CallbackFunction,
  Func1Sync,
  Func2Sync,
  is_func2_async,
  is_func3,
  is_func3_async,
  is_thenable,
  RunPipelineFunction,
  StageObject,
  Thanable,
} from './types'
import {
  is_func0,
  is_func0_async,
  is_func1,
  is_func1_async,
  is_func2,
} from './types'
import { Func1Async, Func2Async, Func3Sync, Possible } from './types'

// может не являться async funciton но может вернуть промис, тогда тоже должен отработать как промис

export function execute_callback<T extends StageObject>(
  err: Possible<Error>,
  run: RunPipelineFunction<T>,
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
          res
            .then(res => done(undefined, res ?? (context as unknown as T)))
            .catch(err => done(err))
        } catch (err) {
          process_error(err, done)
        }
      } else if (is_func0<T>(run)) {
        try {
          const res = run.apply(context)
          if (res instanceof Promise) {
            res
              .then(_ => done(undefined, res ?? (context as unknown as T)))
              .catch(err => done(err))
          } else if (is_thenable(res)) {
            res
              .then(_ => done(undefined, res ?? (context as unknown as T)))
              .catch(err => done(err))
          } else {
            done(undefined, res ?? (context as unknown as T))
          }
        } catch (err) {
          process_error(err, done)
        }
      }
      break
    case 1:
      if (is_func1_async(run)) {
        try {
          ;(run as Func1Async<T, T>)(context)
            .then(ctx => done(undefined, ctx))
            .catch(err => done(err))
        } catch (err) {
          process_error(err, done)
        }
      } else if (is_func1(run)) {
        try {
          const res = (run as Func1Sync<T | Promise<T> | Thanable<T>, T>)(
            context,
          )
          if (res instanceof Promise) {
            res
              .then(r => done(undefined, r ?? (context as unknown as T)))
              .catch(err => done(err))
          } else if (is_thenable(res)) {
            res
              .then(r => done(undefined, r ?? (context as unknown as T)))
              .catch(err => done(err))
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
      if (is_func2_async(run)) {
        try {
          ;(run as Func2Async<T, Possible<Error>, T>)(err, context)
            .then(ctx => done(undefined, ctx))
            .catch(err => done(err))
        } catch (err) {
          process_error(err, done)
        }
      } else if (is_func2(run)) {
        try {
          ;(run as Func2Sync<void, T, CallbackFunction<T>>)(context, done)
        } catch (err) {
          process_error(err, done)
        }
      } else {
        done(CreateError(ERROR.signature))
      }
      break
    case 3:
      if (is_func3(run) && !is_func3_async(run)) {
        try {
          ;(run as Func3Sync<void, Error, T, CallbackFunction<T>>)(
            err as Error,
            context,
            done,
          )
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
