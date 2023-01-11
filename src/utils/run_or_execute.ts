import { ComplexError } from './ErrorList'
import { execute_callback } from './execute_callback'
import { ContextType } from '../context'
import {
  AnyStage,
  CallbackFunction,
  Possible,
  RunPipelineFunction,
  StageObject,
} from './types'

export function run_or_execute<T extends StageObject>(
  stage: AnyStage<T> | RunPipelineFunction<T>,
  err: Possible<ComplexError>,
  context: ContextType<T>,
  _done: CallbackFunction<T>,
): void {
  const done = ((err: Possible<ComplexError>, ctx: ContextType<T>) => {
    _done(err, ctx ?? context)
  }) as CallbackFunction<T>
  if (typeof stage == 'object') {
    stage.execute(err, context, done)
  } else {
    execute_callback<T>(err, stage, context, done)
  }
}
