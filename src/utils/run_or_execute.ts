import { execute_callback } from './execute_callback'
import { IStage, CallbackFunction, RunPipelineFunction } from './types'

export function run_or_execute<T, C, R>(
  stage: IStage<T, C, R> | RunPipelineFunction<T, R>,
  err: Error | undefined,
  context: T | R,
  _done: CallbackFunction<T | R>,
): void {
  const done: CallbackFunction<T | R> = (
    err: Error | undefined,
    ctx: T | R | undefined,
  ) => {
    _done(err, ctx ?? context)
  }

  if (typeof stage == 'object') {
    stage.execute(err, context as T, done)
  } else {
    execute_callback<T, R>(err, stage, context as T, done)
  }
}
