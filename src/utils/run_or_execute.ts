import { execute_callback } from './execute_callback'
import { IStage, CallbackFunction, RunPipelineFunction } from './types'

export function run_or_execute<T, C, R>(
  stage: IStage<T, C, R> | RunPipelineFunction<T, R>,
  err: Error | undefined,
  ctx: T | R,
  done: CallbackFunction<T | R>,
): void {
  if (typeof stage == 'object') {
    stage.execute(err, ctx as T, done)
  } else {
    execute_callback<T, R>(err, stage, ctx as T, done)
  }
}
