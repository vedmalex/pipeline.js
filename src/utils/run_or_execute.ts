import { CleanError } from './ErrorList'
import { execute_callback } from './execute_callback'
import { isAnyStage } from './types'
import {
  AnyStage,
  CallbackFunction,
  Possible,
  RunPipelineFunction,
  StageObject,
} from './types'

export function run_or_execute<T extends StageObject>(
  stage: AnyStage<T> | RunPipelineFunction<T>,
  err: Possible<CleanError>,
  context: T,
  _done: CallbackFunction<T>,
): void {
  // OPT-9: skip wrapper closure when stage is a Stage instance — execute() always
  // resolves with a valid ctx. For function stages, keep the ctx??context fallback
  // since arity-0 functions may omit the return value.
  if (isAnyStage<T>(stage)) {
    stage.execute(err, context, _done)
  } else {
    const done = ((err: Possible<CleanError>, ctx: T) => {
      _done(err, ctx ?? context)
    }) as CallbackFunction<T>
    execute_callback<T>(err, stage, context, done)
  }
}
