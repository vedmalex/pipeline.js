import { execute_callback } from './execute_callback'
import {
  AnyStage,
  CallbackFunction,
  Possible,
  RunPipelineFunction,
} from './types'

export function run_or_execute<T, R, RC, RRET> (
  stage: AnyStage<T, R> | RunPipelineFunction<T, R>,
  err: Possible<Error>,
  context: Possible<RC>,
  _done: CallbackFunction<RRET>,
): void {
  const done: CallbackFunction<R> = (
    err: Possible<Error>,
    ctx: Possible<R>,
  ) => {
    _done(err, (ctx ?? context) as unknown as RRET)
  }
  if (typeof stage == 'object') {
    ;(
      stage.execute as (
        err: Possible<Error>,
        context: Possible<RC>,
        done: CallbackFunction<R>,
      ) => void
    )(err, context, done)
  } else {
    execute_callback<T, R>(err, stage, context as unknown as T, done)
  }
}
