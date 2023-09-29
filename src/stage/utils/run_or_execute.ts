import { isAnyStage } from '../getStageConfig'
import { CallbackFunction, makeCallback, makeCallbackArgs } from '../types'
import { execute_callback } from './execute_callback'

export function run_or_execute<Input, Output>(
  stage: unknown,
  err: unknown,
  context: Input,
  _done: CallbackFunction<Input, Output>,
): void {
  const done: CallbackFunction<Input, Output> = makeCallback((err, ctx) => {
    _done(makeCallbackArgs(err, ctx ?? context as unknown as Output))
  })
  if (isAnyStage<Input, Output>(stage)) {
    stage.exec(err, context, done)
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
    run_or_execute<Input, Output>(
      stage,
      err,
      context,
      makeCallback((err, ctx) => {
        resolve([err, (ctx ?? context) as unknown as Output])
      }),
    )
  })
}
