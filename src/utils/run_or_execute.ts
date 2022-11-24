import { execute_callback } from './execute_callback'
import {
  AnyStage,
  CallbackFunction,
  Possible,
  RunPipelineFunction,
  StageObject,
} from './types'

export function run_or_execute<T extends StageObject>(
  stage: AnyStage<T> | RunPipelineFunction<T>,
  err: Possible<Error>,
  context: Possible<T>,
  _done: CallbackFunction<T>,
): void {
  const done: CallbackFunction<T> = (
    err: Possible<Error>,
    ctx: Possible<T>,
  ) => {
    _done(err, ctx ?? context)
  }
  if (typeof stage == 'object') {
    ;(
      stage.execute as (
        err: Possible<Error>,
        context: Possible<T>,
        done: CallbackFunction<T>,
      ) => void
    )(err, context, done)
  } else {
    execute_callback<T>(err, stage, context as unknown as T, done)
  }
}
