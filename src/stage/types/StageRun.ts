import { CallbackFunction } from './CallbackFunction'

export type StageRun<R> = (
  err: unknown,
  context: R,
  callback: CallbackFunction<R>,
) => void
