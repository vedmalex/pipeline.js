export type LegacyCallback<Output> = (err: Error | undefined, data?: Output) => void

export type CallbackArgs<Input, Output> =
  | {
    result: 'success'
    output: Output
  }
  | {
    result: 'success_empty'
  }
  | {
    result: 'failure'
    reason: Error
    input: Input
  }

export function isCallbackArgs<Input, Output>(inp: unknown): inp is CallbackArgs<Input, Output> {
  return typeof inp === 'object' && inp !== null && 'result' in inp
    && (inp.result === 'success' || inp.result === 'success_empty' || inp.result === 'failure')
}

export function makeCallbackArgs<Input, Output>(
  err: Error | undefined,
  res?: Output,
): CallbackArgs<Input, Output> {
  let result: CallbackArgs<Input, Output>
  if (err) {
    if (err instanceof Error) {
      result = {
        result: 'failure',
        reason: err,
        input: res as Input,
      }
    } else {
      throw new Error('error must be Error type')
    }
  } else if (res) {
    result = { result: 'success', output: res }
  } else {
    result = { result: 'success_empty' }
  }
  return result
}

export function makeCallback<Input, Output>(fn: LegacyCallback<Output>): CallbackFunction<Input, Output> {
  return function (args) {
    switch (true) {
      case args.result === 'success':
        fn(undefined, args.output)
        break
      case args.result === 'success_empty':
        fn(undefined, undefined)
        break
      case args.result === 'failure':
        fn(args.reason, args.input as unknown as Output)
    }
  }
}

export function makeLegacyCallback<Input, Output>(callback: CallbackFunction<Input, Output>) {
  return (err: Error | undefined, res: Output) => {
    callback(makeCallbackArgs(err, res))
  }
}

export type CallbackFunction<Input, Output> = (args: CallbackArgs<Input, Output>) => void
