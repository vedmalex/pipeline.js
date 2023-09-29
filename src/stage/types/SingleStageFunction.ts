import { CallbackFunction, LegacyCallback } from './CallbackFunction'
import { is_async_function } from './is_async_function'

export type SingleStage2Function<Input, Output> = (
  ctx: Input,
  callback: CallbackFunction<Input, Output>,
) => void

export type SingleStage2FunctionLegacy<Input, Output> = (
  ctx: Input,
  callback: LegacyCallback<Output>,
) => void

export function isSingleStageFunction2<Input, Output>(inp?: unknown): inp is SingleStage2Function<Input, Output> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length == 2
}

export type SingleStage3Function<Input, Output> = (
  err: unknown,
  ctx: Input,
  callback: CallbackFunction<Input, Output>,
) => void

export type SingleStage3FunctionLegacy<Input, Output> = (
  err: unknown,
  ctx: Input,
  callback: LegacyCallback<Output>,
) => void

export function isSingleStage3Function<Input, Output>(inp?: unknown): inp is SingleStage3Function<Input, Output> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length == 3
}

export function isSingleStageFunction<Input, Output>(inp?: unknown): inp is SingleStageFunction<Input, Output> {
  return isSingleStage3Function<Input, Output>(inp) || isSingleStageFunction2<Input, Output>(inp)
}
export type SingleStageFunction<Input, Output> =
  | SingleStage2Function<Input, Output>
  | SingleStage3Function<Input, Output>
