import { isAnyStage } from '../getStageConfig'
import { CallbackFunction } from '../types'
import { execute_callback } from './execute_callback'

export function run_or_execute<Input, Output>(
  stage: unknown,
  err: unknown,
  context: Input,
  _done: CallbackFunction<Output>,
): void {
  const done: CallbackFunction<Output> = (err, ctx) => {
    _done(err, ctx ?? context as unknown as Output)
  }
  if (isAnyStage<Input, Output>(stage)) {
    stage.execute(err, context, done)
  } else {
    if (typeof stage === 'function') {
      execute_callback(err, stage, context, done)
    }
  }
}

export function run_or_execute_async<Input, Output>(
  stage: unknown,
  err: unknown,
  context: Input,
): Promise<[unknown, Output]> {
  return new Promise(resolve => {
    run_or_execute<Input, Output>(stage, err, context, (err, ctx) => {
      resolve([err, ctx ?? context as unknown as Output])
    })
  })
}
