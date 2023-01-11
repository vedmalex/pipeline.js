import { ComplexError, CreateError } from './ErrorList'
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
import { Possible } from './types'
import { ContextType } from '../context'

// может не являться async funciton но может вернуть промис, тогда тоже должен отработать как промис

export function execute_callback<T extends StageObject>(
  err: Possible<ComplexError>,
  run: RunPipelineFunction<T>,
  context: ContextType<T>,
  _done: CallbackFunction<T>,
) {
  const done = run_callback_once(_done)
  switch (run.length) {
    // this is the context of the run function
    case 0:
      if (is_func0_async<ContextType<T>>(run)) {
        try {
          const res = run.call(context)
          res
            .then(res => done(undefined, res ?? context))
            .catch(err => done(err))
        } catch (err) {
          process_error(err, done)
        }
      } else if (is_func0<ContextType<T>>(run)) {
        try {
          const res = run.apply(context)
          if (res instanceof Promise) {
            res
              .then(_ => done(undefined, res ?? context))
              .catch(err => done(err))
          } else if (is_thenable(res)) {
            res
              .then(_ => done(undefined, res ?? context))
              .catch(err => done(err))
          } else {
            done(undefined, res ?? context)
          }
        } catch (err) {
          process_error(err, done)
        }
      }
      break
    case 1:
      if (is_func1_async<ContextType<T>, ContextType<T>>(run)) {
        try {
          run(context)
            .then(ctx => done(undefined, ctx))
            .catch(err => done(err))
        } catch (err) {
          process_error(err, done)
        }
      } else if (is_func1(run)) {
        try {
          const res = (
            run as Func1Sync<
              | ContextType<T>
              | Promise<ContextType<T>>
              | Thanable<ContextType<T>>,
              T
            >
          )(context)
          if (res instanceof Promise) {
            res.then(r => done(undefined, r ?? context)).catch(err => done(err))
          } else if (is_thenable(res)) {
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
      if (
        is_func2_async<ContextType<T>, Possible<ComplexError>, ContextType<T>>(
          run,
        )
      ) {
        try {
          run(err, context)
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
      if (
        is_func3<void, Possible<ComplexError>, T, CallbackFunction<T>>(run) &&
        !is_func3_async(run)
      ) {
        try {
          run(err, context, done)
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
