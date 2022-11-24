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
  context: T,
  _done: CallbackFunction<T>,
): void {
  const done = ((err: Possible<Error>, ctx: T) => {
    _done(err, ctx ?? context)
  }) as CallbackFunction<T>
  if (typeof stage == 'object') {
    stage.execute(err, context, done)
  } else {
    execute_callback<T>(err, stage, context as unknown as T, done)
  }
}
