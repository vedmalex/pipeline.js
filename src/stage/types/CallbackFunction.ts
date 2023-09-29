import { ComplexError, CreateError } from '../errors'
import { is_async_function } from './is_async_function'

export type LegacyCallback<Output> = (err: ComplexError | undefined, ctx: Output) => void
export type LegacyCallbackErr = (err: ComplexError) => void
export type LegacyCallbackEmpty = () => void

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
    reason: ComplexError
    input: Input
  }

export function isCallbackArgs<Input, Output>(inp: unknown): inp is CallbackArgs<Input, Output> {
  return typeof inp === 'object' && inp !== null && 'result' in inp
    && (inp.result === 'success' || inp.result === 'success_empty' || inp.result === 'failure')
}

export const makeCallbackArgs = <Input, Output>(
  _err?: unknown,
  res?: unknown,
): CallbackArgs<Input, Output> => {
  let result: CallbackArgs<Input, Output>
  const err = CreateError(_err)
  if (err) {
    result = {
      result: 'failure',
      reason: err,
      input: res as Input,
    }
  } else if (res) {
    result = { result: 'success', output: res as Output}
  } else {
    result = { result: 'success_empty' }
  }
  return result
}

export function makeCallback<Input, Output>(fn: LegacyCallback<Output>): CallbackFunction<Input, Output> {
  return function (args) {
    if (!isCallbackArgs(args)) {
      args = makeCallbackArgs(...arguments)
    }
    switch (true) {
      case args.result === 'success':
        fn(undefined, args.output)
        break
      case args.result === 'success_empty':
        ;(fn as LegacyCallbackEmpty)()
        break
      case args.result === 'failure':
        fn(args.reason, args.input as unknown as Output)
    }
  }
}

export function makeLegacyCallback<Input, Output>(callback: CallbackFunction<Input, Output>) {
  return (err: unknown, res: Output) => {
    if (isCallbackArgs<Input, Output>(err)) {
      err
      callback(err)
    } else {
      callback(makeCallbackArgs(err, res))
    }
  }
}

export type CallbackFunction<Input, Output> = (args: CallbackArgs<Input, Output>) => void

export function isCallbackFunction<Input, Output>(inp?: unknown): inp is CallbackFunction<Input, Output> {
  return typeof inp === 'function' && !is_async_function(inp) && inp.length == 1
}
