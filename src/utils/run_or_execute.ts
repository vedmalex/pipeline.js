import { execute_callback } from './execute_callback'
import { isAnyStage } from './types/types'
import { CallbackFunction } from './types/types'

export function run_or_execute<R>(stage: unknown, err: unknown, context: R, _done: CallbackFunction<R>): void {
  const done: CallbackFunction<R> = (err, ctx) => {
    _done(err, ctx ?? context)
  }
  if (isAnyStage(stage)) {
    stage.execute(err, context, done)
  } else {
    if (typeof stage === 'function') execute_callback(err, stage, context, done)
  }
}
