import { execute_callback } from './execute_callback'
import { isAnyStage } from './types/types'
import { CallbackFunction } from './types/types'

export function run_or_execute<R>(stage: unknown, err: unknown, context: unknown, _done: CallbackFunction<R>): void {
  const done: CallbackFunction<R> = (err, ctx) => {
    _done(err, ctx ?? (context as R))
  }
  if (isAnyStage(stage)) {
    stage.execute(err, context, done)
  } else {
    if (typeof stage === 'function') execute_callback(err, stage, context as R, done)
  }
}

export function run_or_execute_async<R>(stage: unknown, err: unknown, context: unknown): Promise<[unknown, R]> {
  return new Promise(resolve => {
    run_or_execute<R>(stage, err, context, (err, ctx) => {
      resolve([err, (ctx ?? context) as R])
    })
  })
}
