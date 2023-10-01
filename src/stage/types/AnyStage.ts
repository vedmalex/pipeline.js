import { CallbackFunction, LegacyCallback } from './CallbackFunction'
export const StageSymbol = Symbol('stage')

export interface AnyStage<Input, Output> {
  get config(): unknown
  get name(): string
  execute(
    _err?: unknown,
    _context?: Input,
    _callback?: LegacyCallback<Output>,
  ): void | Promise<Output>
  exec(
    _err?: unknown,
    _context?: Input,
    _callback?: CallbackFunction<Input, Output>,
  ): void | Promise<Output>
}

export function isAnyStage<Input, Output>(obj: unknown): obj is AnyStage<Input, Output> {
  return typeof obj === 'object' && obj !== null && StageSymbol in obj
}
