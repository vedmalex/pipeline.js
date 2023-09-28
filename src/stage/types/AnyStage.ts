import { CallbackFunction } from './CallbackFunction'

export interface AnyStage<Input, Output> {
  get config(): unknown
  get reportName(): string
  get name(): string
  toString(): string
  execute(
    _err?: unknown,
    _context?: Input,
    _callback?: CallbackFunction<Output>,
  ): void | Promise<Output>
}
