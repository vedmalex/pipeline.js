import { ContextType } from '../Context'
import { CallbackFunction } from './CallbackFunction'
import { is_async_function } from './is_async_function'
import { StageObject } from './StageObject'

export type SingleStage2Function<R extends StageObject> = (
  ctx: ContextType<R>,
  callback: CallbackFunction<ContextType<R>>,
) => void

export function isSingleStageFunction2<R extends StageObject>(inp?: unknown): inp is SingleStage2Function<R> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length == 2
}

export type SingleStage3Function<R extends StageObject> = (
  err: unknown,
  ctx: ContextType<R>,
  callback: CallbackFunction<ContextType<R>>,
) => void
export function isSingleStage3Function<R extends StageObject>(inp?: unknown): inp is SingleStage3Function<R> {
  return !is_async_function(inp) && typeof inp == 'function' && inp.length == 3
}

export function isSingleStageFunction<R extends StageObject>(inp?: unknown): inp is SingleStageFunction<R> {
  return isSingleStage3Function<R>(inp) || isSingleStageFunction2<R>(inp)
}
export type SingleStageFunction<R extends StageObject> = SingleStage2Function<R> | SingleStage3Function<R>
