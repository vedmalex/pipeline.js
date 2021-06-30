import { CreateError } from './ErrorList'
import {
  CallbackFunction,
  Func1Sync,
  Func2Sync,
  is_func2_async,
  is_func3,
  is_func3_async,
  is_thenable,
  RunPipelineFunction,
  Thanable,
} from './types'
import {
  is_func0,
  is_func2,
  is_func0_async,
  is_func1_async,
  is_func1,
} from './types'
import { Func2Async, Func3Sync, Func1Async } from './types'
import { process_error } from './process_error'
import { ERROR } from './errors'

// может не являться async funciton но может вернуть промис, тогда тоже должен отработать как промис

export function execute_callback<T, R>(
  err: Error | undefined,
  run: RunPipelineFunction<T, R>,
  context: T,
  done: CallbackFunction<T | R>,
) {
  switch (run.length) {
    // this is the context of the run function
    case 0:
      if (is_func0_async<T>(run)) {
        try {
          const res = run.call(context)
          res.then(res => done(undefined, res || context)).catch(done)
        } catch (err) {
          process_error<T | R>(err, done)
        }
      } else if (is_func0(run)) {
        try {
          const res = run.apply(context)
          if (res instanceof Promise) {
            res.then(_ => done(undefined, context)).catch(done)
          } else if (is_thenable(res)) {
            res.then(_ => done(undefined, context)).catch(done)
          } else {
            done(undefined, context)
          }
        } catch (err) {
          process_error(err, done)
        }
      }
      break
    case 1:
      if (is_func1_async(run)) {
        try {
          ;(run as Func1Async<R | T, T>)(context)
            .then(ctx => done(undefined, ctx))
            .catch(done)
        } catch (err) {
          process_error<T | R>(err, done)
        }
      } else if (is_func1(run)) {
        try {
          const res = (
            run as Func1Sync<R | T | Promise<R | T> | Thanable<R | T>, T>
          )(context)
          if (res instanceof Promise) {
            res.then(_ => done(undefined, context)).catch(done)
          } else if (is_thenable(res)) {
            res.then(_ => done(undefined, context)).catch(done)
          } else {
            done(undefined, context)
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
          ;(run as Func2Async<T | R, Error | undefined, T>)(err, context)
            .then(ctx => done(undefined, ctx))
            .catch(done)
        } catch (err) {
          process_error(err, done)
        }
      } else if (is_func2(run)) {
        try {
          ;(run as Func2Sync<void, T, CallbackFunction<R | T>>)(context, done)
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
          ;(run as Func3Sync<void, Error, T, CallbackFunction<T | R>>)(
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
