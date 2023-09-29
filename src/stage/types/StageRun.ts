import { CallbackFunction } from './CallbackFunction'

export type StageRun<Input, Output> = (
  err: unknown,
  context: Input,
  callback: CallbackFunction<Input, Output>,
) => void
