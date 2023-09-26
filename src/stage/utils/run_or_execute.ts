import { ContextType } from '../Context'
import { isAnyStage } from '../getStageConfig'
import { CallbackFunction, StageObject } from '../types'
import { execute_callback } from './execute_callback'

export function run_or_execute<R extends StageObject>(
  stage: unknown,
  err: unknown,
  context: ContextType<R>,
  _done: CallbackFunction<ContextType<R>>,
): void {
  const done: CallbackFunction<ContextType<R>> = (err, ctx) => {
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

export function run_or_execute_async<R extends StageObject>(
  stage: unknown,
  err: unknown,
  context: ContextType<R>,
): Promise<[unknown, ContextType<R>]> {
  return new Promise(resolve => {
    run_or_execute<R>(stage, err, context, (err, ctx) => {
      resolve([err, ctx ?? context])
    })
  })
}
