import { isAnyStage } from '../getStageConfig'
import { CallbackFunction } from '../types'
import { execute_callback } from './execute_callback'

export function run_or_execute<R>(
  stage: unknown,
  err: unknown,
  context: R,
  _done: CallbackFunction<R>,
): void {
  const done: CallbackFunction<R> = (err, ctx) => {
    _done(err, ctx ?? context)
  }
  if (isAnyStage<R>(stage)) {
    stage.execute(err, context, done)
  } else {
    if (typeof stage === 'function') {
      execute_callback(err, stage, context, done)
    }
  }
}

export function run_or_execute_async<R>(
  stage: unknown,
  err: unknown,
  context: R,
): Promise<[unknown, R]> {
  return new Promise(resolve => {
    run_or_execute<R>(stage, err, context, (err, ctx) => {
      resolve([err, ctx ?? context])
    })
  })
}
